const moment = require('moment');
const Promise = require('bluebird');
const { get } = require('../request');
const errors = require('request-promise/errors');
const PoolError = require('./poolError');

module.exports = function(poolName, unit) {
  return function(wallet) {
    const baseUrl = 'https://supportxmr.com/api';
    let identifiersUrl = baseUrl + `/miner/${wallet}/identifiers`;
    return get(identifiersUrl).then(body => {
      return Promise.mapSeries(body, rigName => {
        let statsUrl = baseUrl + `/miner/${wallet}/stats/${rigName}`;
        return get(statsUrl).then(rig => {
          return {
            name: rig.identifer,
            poolName,
            lastSeen: moment.unix(rig.lts),
            hashrate: {
              unit,
              current: parseInt(rig.hash) / 1000,
            },
          };
        });
      });
    }).catch(errors.StatusCodeError, reason => {
      throw new PoolError(reason.message, reason.statusCode, reason.error);
    }).catch(errors.RequestError, reason => {
      throw PoolError.NetworkError(reason.message);
    });
  };
};
