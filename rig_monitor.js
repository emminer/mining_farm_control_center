const moment = require('moment');
const Promise = require('bluebird');
const _ = require('lodash');
const Table = require('easy-table');
const FixedArray = require('fixed-length-array');

const logger = require('./logger');
const ping = require('./ping');
const gpu = require('./gpu');
const config = require('./config');
const poolFactory = require('./pools/factory');
const PoolError = require('./pools/poolError');
const rigBuilder = require('./rigBuilder');
const { post } = require('./request');

const RIGS = JSON.parse(JSON.stringify(config.rigs));//deep copy
const ACTION_HISTORY = new FixedArray(100);
let snapshot;
try {
  snapshot = require('./snapshot.json');
} catch (e) {
  // continue regardless of error
}
if (snapshot && snapshot.time && moment(snapshot.time).add(5, 'minutes').isAfter(moment())) {
  RIGS.forEach(rig => {
    let rig2 = _.find(snapshot.rigs, r => r.name === rig.name && r.coin === rig.coin && r.pool === rig.pool.name);
    if (rig2) {
      rig.offline = rig2.offline;
      if (!rig.offline && rig2.startedAt) {
        rig.startedAt = moment(rig2.startedAt);
      }
    }
  });
  logger.info('RIGS are restored from snapshot.');
}

const CHECK_GPU_INTERVAL_MINUTES = config.check_gpu_interval_minutes;
let lastCheckGpuTime = moment().subtract(1, 'days');
let locker = false;

function start() {
  return Promise.resolve().then(() => {
    if (!lock()) {
      logger.info('locked, delay 15 seconds');
      return Promise.delay(15 * 1000).then(start);
    }

    let now = moment();
    let checkGpu = lastCheckGpuTime.isBefore(now.clone().subtract(CHECK_GPU_INTERVAL_MINUTES, 'minutes'));
    if (checkGpu) {
      lastCheckGpuTime = now;
    }

    return checkRigs(checkGpu).then(() => {
      unlock();
      return Promise.delay(config.check_rigs_time_minutes * 60 * 1000).then(start);
    }, (err) => {
      logger.error(err);
      unlock();
      return Promise.delay(config.check_rigs_time_minutes * 60 * 1000).then(start);
    });
  });
}

function checkRigs(checkGpu) {
  logger.info('=============GONNA CHECK RIGS' + (checkGpu ? ' WITH GPU' : ''));
  let onlineRIGS = RIGS.filter(r => !r.offline);
  return checkPing(onlineRIGS).then(({ reachable, unreachable }) => {
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
        let fromPool = _.find(rigsFromPool, r => r.name === rig.name && r.poolName === rig.pool.name);
        if (fromPool) {
          if (fromPool.poolError) {
            rig.lastAction = {action: 'recheck_pool_error', reason: fromPool.poolError.message, time: now};
          } else if (!fromPool.lastSeen) {
            if (isStarting(rig)){
              rig.lastAction = {action: 'recheck_starting', reason: 'lastSeenNull', time: now};
            } else {
              let prevAction = rig.lastAction;
              if (!prevAction || prevAction.action !== 'notSeen') {
                if (rig.pool.on_not_in_pool_wait_minutes_before_reset) {
                  rig.lastAction = {action: 'notSeen', time: now};
                  logger.warn(`rig ${rig.name} is not seen, check pool in next round.`);
                } else {
                  rig.lastAction = {action: 'reset', reason: 'notSeen'};
                }
              } else {//prev action is notSeen, check time
                if (now.clone().subtract(rig.pool.on_not_in_pool_wait_minutes_before_reset, 'minutes')
                  .isAfter(prevAction.time)) {
                  rig.lastAction = {action: 'reset', reason: 'notSeen'};
                } else {
                  logger.warn(`rig ${rig.name} is not seen, check pool in next round.`);
                }
              }
            }
          } else if (now.clone().subtract(rig.pool.lastSeen_delay_minutes || 40, 'minutes').isAfter(fromPool.lastSeen)) {
            if (isStarting(rig)){
              rig.lastAction = {action: 'recheck_starting', reason: 'longTimeNoSee', time: now};
            } else {
              rig.lastAction = {action: 'reset', reason: 'longTimeNoSee'};
            }
          } else if (fromPool.hashrate.current < rig.min_hashrate) {
            rig.hashrate = fromPool.hashrate;
            if (isStarting(rig)){
              rig.lastAction = {action: 'recheck_starting', reason: 'lowHashrate', time: now};
            } else {
              let prevAction = rig.lastAction;
              if (!prevAction || prevAction.action !== 'lowHashrate') {
                if (rig.pool.on_low_hashrate_wait_minutes_before_reset) {
                  rig.lastAction = {action: 'lowHashrate', time: now};
                  logger.warn(`rig ${rig.name}'s hashrate is low, check pool in next round.`);
                } else {
                  rig.lastAction = {action: 'reset', reason: 'lowHashrate'};
                }
              } else {//prev action is lowHashrate, check time
                if (now.clone().subtract(rig.pool.on_low_hashrate_wait_minutes_before_reset, 'minutes')
                  .isAfter(prevAction.time)) {
                  rig.lastAction = {action: 'reset', reason: 'lowHashrate'};
                } else {
                  logger.warn(`rig ${rig.name}'s hashrate is low, check pool in next round.`);
                }
              }
            }
          } else {
            rig.hashrate = fromPool.hashrate;
            rig.lastSeen = fromPool.lastSeen;
            rig.lastAction = {action: 'continue', time: now};
          }
        } else {//canoot be found from pool
          if (isStarting(rig)) {
            rig.lastAction = {action: 'recheck_pool', time: now};
          } else {
            let prevAction = rig.lastAction;
            if (!prevAction || prevAction.action !== 'notFoundInPool') {
              if (rig.pool.on_not_found_in_pool_wait_minutes_before_reset) {
                rig.lastAction = {action: 'notFoundInPool', time: now};
                logger.warn(`rig ${rig.name} is not found in pool, check pool in next round.`);
              } else {
                rig.lastAction = {action: 'reset', reason: 'notFoundInPool'};
              }
            } else {//prev action is notFoundInPool, check time
              if (now.clone().subtract(rig.pool.on_not_found_in_pool_wait_minutes_before_reset, 'minutes')
                .isAfter(prevAction.time)) {
                rig.lastAction = {action: 'reset', reason: 'notFoundInPool'};
              } else {
                logger.warn(`rig ${rig.name} is not found in pool, check pool in next round.`);
              }
            }
          }
        }
      });

      let startups = [];
      let resets = [];
      onlineRIGS.forEach(rig => {
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
              rig.lastAction.action = 'reset';
              resets.push(rig);
              if (gpuErr instanceof Promise.TimeoutError) {
                rig.lastAction.reason = 'nvidia-smi hangs';
              } else if (gpuErr.code === 'ECONNREFUSED') {
                rig.lastAction.reason = 'ssh_ECONNREFUSED';
              } else if (gpuErr.sshExitCode) {
                rig.lastAction.reason = `nvidia-smi error, code: ${gpuErr.sshExitCode}, stdout: ${gpuErr.stdout}, stderr: ${gpuErr.stderr}`;
              } else {
                logger.error('nvidia-smi error, unknown: ', gpuErr);
                rig.lastAction.reason = 'nvidia-smi error, ' + gpuErr.message;
              }
            }
            return null;
          });
        });
      } else {
        gpuPromise = Promise.resolve(reachable.map(() => 'unchanged'));
      }

      return gpuPromise.then(rigsWithGpu => {
        rigsWithGpu.forEach((withGpu, index) => {
          if (withGpu && withGpu !== 'unchanged') {
            reachable[index].gpu = withGpu;
          }
        });
        logRigs();

        const rigGPIO = rigBuilder();
        return Promise.mapSeries(startups, rig => {
          logger.warn(`starting rig ${rig.name} ${rig.ip}`);
          ACTION_HISTORY.unshift({
            time: moment(),
            action: rig.lastAction.action,
            rig: {
              name: rig.name,
              coin: rig.coin,
              hashrate: rig.hashrate ? rig.hashrate.current : 0,
            },
            reason: rig.lastAction.reason,
          });
          return rigGPIO.startup(rig.pin).then(() => {
            logger.warn(`rig ${rig.name} ${rig.ip} was started.`);
            rig.startedAt = rig.lastAction.time = moment();
            return Promise.delay(1000);
          });
        }).then(() => {
          return Promise.mapSeries(resets, rig => {
            logger.warn(`reseting rig ${rig.name} ${rig.ip}`);
            ACTION_HISTORY.unshift({
              time: moment(),
              action: rig.lastAction.action,
              rig: {
                name: rig.name,
                coin: rig.coin,
                hashrate: rig.hashrate ? rig.hashrate.current : 0,
              },
              reason: rig.lastAction.reason,
            });
            return rigGPIO.restart_try_soft(rig.ip, rig.pin).then((softOrHard) => {
              logger.warn(`rig ${rig.name} ${rig.ip} was resetted ${softOrHard}.`);
              rig.startedAt = rig.lastAction.time = moment();
              rig.resettedSoftOrHard = softOrHard;
              return Promise.delay(1000);
            });
          });
        }).then(reportRigsToServer);
      });
    });
  });
}

function exit(cb) {
  logger.warn('app is exiting...');
  let rigs = RIGS.map(rig => ({
    name: rig.name,
    coin: rig.coin,
    pool: rig.pool.name,
    startedAt: rig.startedAt,
    offline: rig.offline,
  }));
  require('fs').writeFile('snapshot.json', JSON.stringify({
    time: moment(),
    rigs,
  }), cb);
}

function lock() {
  if (locker) {
    return false;
  }

  return locker = true;
}

function unlock() {
  locker = false;
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
    let apikey = grouped[pool][0].pool.apikey;
    return poolFactory(pool)(miner, apikey).catch(err => {
      logger.error(`pool: ${pool}, `, err.message);
      if (err instanceof PoolError) {
        return grouped[pool].map(r => {
          return {name: r.name, poolName: pool, poolError: err};
        });
      } else {
        throw err;
      }
    });
  }).then(result => {
    return _.flatten(result);
  });
}

function isBooting(rig) {
  return rig.startedAt && moment().subtract(5, 'minutes').isBefore(rig.startedAt);
}

function isStarting(rig) {
  return rig.startedAt && moment().subtract(rig.pool.warm_minutes, 'minutes').isBefore(rig.startedAt);
}

function logRigs() {
  RIGS.forEach(rig => {
    let status = rig.offline ? 'offline' : 'online';
    let name = getDisplayName(rig);
    let lastAction = rig.lastAction ? `${rig.lastAction.action}-${rig.lastAction.reason || ''}` : 'unknown';
    let hashrate = rig.hashrate ? `${rig.hashrate.current}${rig.hashrate.unit}` : 0;
    logger.info(`${name} action: ${lastAction}, hashrate: ${hashrate} ${status}`);
    if (rig.gpu) {
      logger.verbose('gpu:\n' + Table.print(rig.gpu.map(g => ({
        i: g.index,
        temp: g.temp + '°C',
        fan: g.fan + '%',
        util: g.util,
      }))));
    }
  });
}

function reportRigsToServer() {
  post(config.report_status_endpoint, config.report_status_token, {rigs: RIGS}, (err) => {
    if (err) {
      return logger.error(err);
    }

    logger.info('status was reported.');
  });
}

function getDisplayName(rig) {
  return `rig ${rig.name} ${rig.coin}`;
}

module.exports = { RIGS, ACTION_HISTORY, start, checkRigs, exit, lock, unlock };
