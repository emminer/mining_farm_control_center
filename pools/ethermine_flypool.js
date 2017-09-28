const moment = require('moment');
const { get } = require('../request');
const errors = require('request-promise/errors');
const PoolError = require('./poolError');

module.exports = function(poolName, endpoint, unit, hashrateHandler, enableLastSeen){
  return function(miner) {
    const url = `${endpoint}/miner/${miner}/workers`;
    return get(url).then(resp => {
      if (resp.status === 'OK') {
        return (resp.data || []).map(worker => {
          return {
            name: worker.worker,
            poolName,
            lastSeen: enableLastSeen ? (worker.lastSeen ? moment.unix(worker.lastSeen) : null) : moment(),
            hashrate: {
              unit,
              current: worker.currentHashrate ? hashrateHandler(worker.currentHashrate) : 0,
              avg24h: worker.averageHashrate ? hashrateHandler(worker.averageHashrate) : 0,
            },
          };
        });
      } else {
        throw new PoolError(`Pool error, status: ${resp.status}`, 500, resp.error);
      }
    }).catch(errors.StatusCodeError, reason => {
      throw new PoolError(reason.message, reason.statusCode, reason.error);
    }).catch(errors.RequestError, reason => {
      throw PoolError.NetworkError(reason.message);
    });
  };
};
