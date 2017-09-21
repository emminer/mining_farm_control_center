const moment = require('moment');
const Promise = require('bluebird');
var _ = require('lodash');

const logger = require('./logger');
const ping = require('./ping');
const config = require('./config');
const poolFactory = require('./pools/factory');
const PoolError = require('./pools/poolError');

const RIGS = JSON.parse(JSON.stringify(config.rigs));//deep copy
const TRUN_ON_QUEUE = [];

function checkRigs() {
  return checkPing(RIGS).then(({ reachable, unreachable }) => {
    let now = moment();
    unreachable.forEach(rig => {
      if (!rig.lastAction) {
        rig.lastAction = {action: 'startup', reason: 'ping'};
        return;
      }

      if (isStarting(rig)) {
        rig.lastAction = {action: 'recheck_starting', reason: 'ping', time: now};
        return;
      }
      rig.lastAction = {action: 'reset', reason: 'ping'};
    });
    reachable.forEach(rig => {
      rig.startedAt = rig.startedAt || now.subtract(2, 'hours');
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
              rig.lastAction = {action: 'reset', reason: 'hahsrate0'};
            }
          } else if (!fromPool.lastSeen) {
            if (isStarting(rig)){
              rig.lastAction = {action: 'recheck_starting', reason: 'lastSeenNull', time: now};
            } else {
              rig.lastAction = {action: 'reset', reason: 'lastSeenNull'};
            }
          } else if (now.subtract(20, 'minutes').isAfter(fromPool.lastSeen)) {
            if (isStarting(rig)){
              rig.lastAction = {action: 'recheck_starting', reason: 'longTimeNoSee', time: now};
            } else {
              rig.lastAction = {action: 'reset', reason: 'longTimeNoSee'};
            }
          } else if (fromPool.hashrate.current <= rig.min_hashrate && now.subtract(1, 'hours').isAfter(rig.startedAt)) {
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
      logRigs();

/*
      //start, restart
      const rigGPIO = require('./rig');
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
      //*/
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

  return Promise.map(pools, pool => {
    let miner = grouped[pool][0].pool.miner;
    return poolFactory(pool)(miner).catch(err => {
      logger.error(`pool: ${pool}, `, err);
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

function isStarting(rig) {
  return rig.startedAt && moment().subtract(10, 'minutes').isBefore(rig.startedAt);
}

function logRigs() {
  RIGS.forEach(rig => {
    let name = getDisplayName(rig);
    let lastAction = rig.lastAction ? `${rig.lastAction.action}-${rig.lastAction.reason || ''}` : 'unknown';
    let hashrate = rig.hashrate ? `${rig.hashrate.current}${rig.hashrate.unit}` : 0;
    logger.info(`${name} action: ${lastAction}, hashrate: ${hashrate}`);
  });
}

function getDisplayName(rig) {
  return `rig ${rig.name} ${rig.ip}`;
}

module.exports = { checkRigs };
