var ping = require ("ping");
var Promise = require('bluebird');

module.exports = function(targets) {
  return Promise.map(targets, target => {
    return ping.promise.probe(target).then(res => res.alive).catch(() => false);
  });
};
