const moment = require('moment');
const { get } = require('../request');
const errors = require('request-promise/errors');
const PoolError = require('./poolError');

module.exports = function(poolName) {
  return function(coinname, unit, hashrateHandler){
    return function(user, apikey) {
      let timestamp = moment().unix();
      let host;
      if (poolName.startsWith('mph')) {
        host = 'miningpoolhub.com';
      } else if (poolName.startsWith('suprnova')) {
        host = 'suprnova.cc';
      }
      const url = `https://${coinname}.${host}/index.php?page=api&action=getuserworkers&api_key=${apikey}&_ts=${timestamp}`;
      return get(url).then(resp => {
        let now = moment();
        return (resp.getuserworkers.data || []).map(worker => {
          return {
            name: worker.username.substr(worker.username.indexOf('.') + 1),
            poolName,
            lastSeen: now,
            hashrate: {
              unit,
              current: worker.hashrate ? hashrateHandler(worker.hashrate) : 0,
              avg24h: worker.hashrate ? hashrateHandler(worker.hashrate) : 0,
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
