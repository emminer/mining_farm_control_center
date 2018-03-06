const moment = require('moment');
const { get } = require('../request');
const errors = require('request-promise/errors');
const PoolError = require('./poolError');

module.exports = function(poolName, currency) {
  return function(wallet){
    const url = `http://api.bsod.pw/api/walletEx?address=${wallet}`;
    return get(url).then(resp => {
      if (currency === resp.currency && resp.miners && resp.miners.length) {
        let now = moment();
        return resp.miners.map(miner => {
          return {
            name: miner.ID,
            poolName,
            lastSeen: now,
            hashrate: {
              unit: 'MH/s',
              current: 0,
            }
          };
        });
      } else {
        return [];
      }
    }).catch(errors.StatusCodeError, reason => {
      throw new PoolError(reason.message, reason.statusCode, reason.error);
    }).catch(errors.RequestError, reason => {
      throw PoolError.NetworkError(reason.message);
    });
  };
};
