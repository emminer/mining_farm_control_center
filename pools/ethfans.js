const moment = require('moment');
const { get } = require('../request');
const errors = require('request-promise/errors');
const PoolError = require('./poolError');

module.exports = function(miner) {
  const url = `http://eth.ethfans.org/api/page/miner?value=${miner}`;
  return get(url).then(resp => {
    if (resp.workers && resp.workers.code === 200) {
      return (resp.workers.data || []).map(worker => {
        return {
          name: worker.rig,
          poolName: 'ethfans',
          lastSeen: moment(worker.time),
          hashrate: {
            unit: 'MH/s',
            current: Math.round(worker.hashrate / 1000 / 100) / 10,
            avg24h: Math.round(worker.hashrate1d / 1000 / 100) / 10,
          },
        };
      });
    } else {
      let code = resp.workers ? resp.workers.code : 0;
      throw new PoolError(`Pool error, status: ${code}`, 500);
    }
  }).catch(errors.StatusCodeError, reason => {
    throw new PoolError(reason.message, reason.statusCode, reason.error);
  }).catch(errors.RequestError, reason => {
    throw PoolError.NetworkError(reason.message);
  });
};
