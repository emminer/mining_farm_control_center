var ping = require ("net-ping");
var Promise = require('bluebird');

module.exports = function(targets) {
  var session = ping.createSession();
  var pingHost = Promise.promisify(session.pingHost, {context: session});
  return Promise.map(targets, target => {
    return pingHost(target).then(() => true).catch(() => false);
  });
}
