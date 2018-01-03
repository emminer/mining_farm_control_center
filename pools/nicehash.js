const moment = require('moment');
const { get } = require('../request');
const errors = require('request-promise/errors');
const PoolError = require('./poolError');

module.exports = function(poolName) {
  return function(algo, unit, hashrateHandler){
    return function(miner) {
      if (!hashrateHandler) {
        hashrateHandler = o => o;
      }
      let timestamp = moment().unix();
      let algoCode = algo2code(algo);
      const url = `https://api.nicehash.com/api?method=stats.provider.workers&addr=${miner}&algo=${algoCode}&_ts=${timestamp}`;

      return get(url).then(resp => {
        if (!resp.result) {
          throw new PoolError('nicehash error: no result', 500);
        } else if (resp.result.error) {
          throw new PoolError(`nicehash error: ${resp.result.error}`, 500);
        }

        return (resp.result.workers || []).map(worker => {
          return {
            name: worker[0],
            poolName,
            lastSeen: moment(),
            hashrate: {
              unit,
              current: worker[1].a ? hashrateHandler(parseFloat(worker[1].a)) : 0,
              avg24h: worker[1].a ? hashrateHandler(parseFloat(worker[1].a)) : 0,
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

function algo2code(algo) {
  if (algo === 'CryptoNight') {
    return 22;
  } else if (algo === 'Lyra2REv2') {
    return 14;
  } else if (algo === 'NeoScrypt') {
    return 8;
  } else if (algo === 'Nist5') {
    return 7;
  }

  return 0;
}
