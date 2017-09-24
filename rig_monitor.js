const moment = require('moment');
const Promise = require('bluebird');
const _ = require('lodash');
const Table = require('easy-table');

const logger = require('./logger');
const ping = require('./ping');
const gpu = require('./gpu');
const config = require('./config');
const poolFactory = require('./pools/factory');
const PoolError = require('./pools/poolError');

const RIGS = JSON.parse(JSON.stringify(config.rigs));//deep copy
const TRUN_ON_QUEUE = [];
const CHECK_GPU_INTERVAL_MINUTES = 30;
let lastCheckGpuTime = moment().subtract(1, 'days');

function start() {
  return Promise.resolve().then(() => {
    let now = moment();
    let checkGpu = lastCheckGpuTime.isBefore(now.clone().subtract(CHECK_GPU_INTERVAL_MINUTES, 'minutes'));
    if (checkGpu) {
      lastCheckGpuTime = now;
    }
    
    return checkRigs(checkGpu).then(() => {
      return Promise.delay(config.check_rigs_time_minutes * 60 * 1000).then(start);
    });
  });
}

function checkRigs(checkGpu) {
  logger.info('=============GONNA CHECK RIGS' + (checkGpu ? ' WITH GPU' : ''));
  return checkPing(RIGS).then(({ reachable, unreachable }) => {
    let now = moment();
    unreachable.forEach(rig => {
      if (!rig.lastAction) {
        rig.lastAction = {action: 'startup', reason: 'ping'};
        return;
      }

      if (isBooting(rig)) {
        rig.lastAction = {action: 'recheck_booting', reason: 'ping', time: now};
        return;
      }
      rig.lastAction = {action: 'reset', reason: 'ping'};
    });
    reachable.forEach(rig => {
      rig.startedAt = rig.startedAt || now;
    });
    return checkPools(reachable).then(rigsFromPool => {
      now = moment();
      reachable.forEach(rig => {
        let fromPool = _.find(rigsFromPool, r => r.name === rig.name);
        if (fromPool) {
          if (fromPool.poolError) {
            rig.lastAction = {action: 'recheck_pool_error', reason: fromPool.poolError.message, time: now};
          } else if (fromPool.hashrate.current === 0) {
            if (isStarting(rig)){
              rig.lastAction = {action: 'recheck_starting', reason: 'hashrate0', time: now};
            } else {
              rig.lastAction = {action: 'reset', reason: 'hashrate0'};
            }
          } else if (!fromPool.lastSeen) {
            if (isStarting(rig)){
              rig.lastAction = {action: 'recheck_starting', reason: 'lastSeenNull', time: now};
            } else {
              rig.lastAction = {action: 'reset', reason: 'lastSeenNull'};
            }
          } else if (now.clone().subtract(20, 'minutes').isAfter(fromPool.lastSeen)) {
            if (isStarting(rig)){
              rig.lastAction = {action: 'recheck_starting', reason: 'longTimeNoSee', time: now};
            } else {
              rig.lastAction = {action: 'reset', reason: 'longTimeNoSee'};
            }
          } else if (fromPool.hashrate.current <= rig.min_hashrate && now.clone().subtract(1, 'hours').isAfter(rig.startedAt)) {
            rig.hashrate = fromPool.hashrate;
            rig.lastAction = {action: 'reset', reason: 'lowHashrate'};
          } else {
            rig.hashrate = fromPool.hashrate;
            rig.lastAction = {action: 'continue', time: now};
          }
        } else {
          if (isStarting(rig)) {
            rig.lastAction = {action: 'recheck_pool', time: now};
          } else {
            rig.lastAction = {action: 'reset', reason: 'notFoundInPool'};
          }
        }
      });

      let startups = [];
      let resets = [];
      RIGS.forEach(rig => {
        if (rig.lastAction.action === 'startup') {
          startups.push(rig);
        } else if (rig.lastAction.action === 'reset') {
          resets.push(rig);
        } else {
          logger.info(`rig ${rig.name} ${rig.ip} is running.`);
        }
      });

      let gpuPromise;
      if (checkGpu) {
        gpuPromise = Promise.mapSeries(reachable, rig => {
          return gpu(rig.ip).catch((gpuErr) => {
            if (rig.lastAction.action !== 'reset') {
              rig.lastAction.action = 'reset';//TODO: add this rig to reset list to reset it.
              if (gpuErr instanceof Promise.TimeoutError) {
                rig.lastAction.reason = 'nvidia-smi hangs';
              } else if (gpuErr.code === 'ECONNREFUSED') {
                rig.lastAction.reason = 'ECONNREFUSED';
              } else if (gpuErr.sshExitCode !== 0) {
                rig.lastAction.reason = `nvidia-smi error, code: ${gpuErr.sshExitCode}, stderr: ${gpuErr.stderr}`;
              } else {
                logger.error('nvidia-smi error, unknown: ', gpuErr);
              }
            };
            return null;
          });
        });
      } else {
        gpuPromise = Promise.resolve(reachable.map(r => null));
      }

      return gpuPromise.then(rigsWithGpu => {
        rigsWithGpu.forEach((withGpu, index) => {
          reachable[index].gpu = withGpu;
        })
        logRigs();
        //TODO: report rigs to server.

        const rigGPIO = process.env.NODE_ENV === 'production' ? require('./rig') : {
          startup: function(pin){
            logger.info(`GPIO startups pin ${pin}`);
            return Promise.resolve('');
          },
          restart: function(pin){
            logger.info(`GPIO restarts pin ${pin}`);
            return Promise.resolve('');
          }
        };
        return Promise.mapSeries(startups, rig => {
          logger.warn(`starting rig ${rig.name} ${rig.ip}`);
          return rigGPIO.startup(rig.pin).then(() => {
            logger.warn(`rig ${rig.name} ${rig.ip} was started.`);
            rig.startedAt = rig.lastAction.time = moment();
            return Promise.delay(1000);
          });
        }).then(() => {
          return Promise.mapSeries(resets, rig => {
            logger.warn(`reseting rig ${rig.name} ${rig.ip}`);
            return rigGPIO.restart(rig.pin).then(() => {
              logger.warn(`rig ${rig.name} ${rig.ip} was resetted.`);
              rig.startedAt = rig.lastAction.time = moment();
              return Promise.delay(1000);
            });
          });
        });
      });
    });
  });
}

function checkPing(rigs){//return reachable and unreachable rigs
  return ping(rigs.map(r => r.ip)).then(result => {
    let reachable = [];
    let unreachable = [];
    for (let i = 0; i< rigs.length; i++) {
      if (result[i]) {
        reachable.push(rigs[i]);
      } else {
        unreachable.push(rigs[i]);
      }
    }
    return {
      reachable,
      unreachable
    };
  });
}

function checkPools(rigs){
  let grouped = _.groupBy(rigs, rig => rig.pool.name);
  let pools = Object.keys(grouped);

  return Promise.mapSeries(pools, pool => {
    let miner = grouped[pool][0].pool.miner;
    return poolFactory(pool)(miner).catch(err => {
      logger.error(`pool: ${pool}, `, err.message);
      if (err instanceof PoolError) {
        return grouped[pool].map(r => {
          return {name: r.name, poolError: err};
        });
      } else {
        throw err;
      }
    });
  }).then(result => {
    return _.flatten(result);
  })
}

function isBooting(rig) {
  return rig.startedAt && moment().subtract(5, 'minutes').isBefore(rig.startedAt);
}

function isStarting(rig) {
  return rig.startedAt && moment().subtract(15, 'minutes').isBefore(rig.startedAt);
}

function logRigs() {
  RIGS.forEach(rig => {
    let name = getDisplayName(rig);
    let lastAction = rig.lastAction ? `${rig.lastAction.action}-${rig.lastAction.reason || ''}` : 'unknown';
    let hashrate = rig.hashrate ? `${rig.hashrate.current}${rig.hashrate.unit}` : 0;
    logger.info(`${name} action: ${lastAction}, hashrate: ${hashrate}`);
    if (rig.gpu) {
      logger.info('gpu:\n' + Table.print(rig.gpu.map(g => ({
        i: g.index,
        temp: g.temp + '°C',
        fan: g.fan + '%',
        util: g.util,
      }))));
    }
  });
}

function getDisplayName(rig) {
  return `rig ${rig.name} ${rig.ip}`;
}

module.exports = { start, checkRigs };
