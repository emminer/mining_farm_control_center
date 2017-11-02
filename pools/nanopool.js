const moment = require('moment');
const { get } = require('../request');
const errors = require('request-promise/errors');
const PoolError = require('./poolError');

module.exports = function(poolName) {
  return function(coinname, unit, hashrateHandler){
    return function(miner) {
      if (!hashrateHandler) {
        hashrateHandler = o => o;
      }
      let timestamp = moment().unix();
      const url = `https://api.nanopool.org/v1/${coinname}/user/${miner}?_ts=${timestamp}`;
      return get(url).then(resp => {
        if (!resp.status || !resp.data) {
          throw new PoolError(`nanopool error: ${resp.error}`, 500);
        }
        return (resp.data.workers || []).map(worker => {
          return {
            name: worker.id,
            poolName,
            lastSeen: moment.unix(worker.lastshare),
            hashrate: {
              unit,
              current: worker.h1 ? hashrateHandler(parseFloat(worker.h1)) : 0,
              avg24h: worker.h24 ? hashrateHandler(parseFloat(worker.h24)) : 0,
            },
          };
        });
      }).catch(errors.StatusCodeError, reason => {
        throw new PoolError(reason.message, reason.statusCode, reason.error);
      }).catch(errors.RequestError, reason => {
        throw PoolError.NetworkError(reason.message);
      });
    };
  };
};
