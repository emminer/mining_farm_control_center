var ping = require ('ping');
var logger = require('./logger');
var Promise = require('bluebird');

module.exports = function(targets) {
  return Promise.mapSeries(targets, target => {
    logger.verbose(`ping ${target}...`);
    return ping.promise.probe(target, {timeout: 10, min_reply: 4})
      .then(res => res.alive).catch(() => false);
  });
};
