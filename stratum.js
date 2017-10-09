const Client = require('stratum').Client;
const Promise = require('bluebird');

function isAlive(address) {
  address = address.substring(address.lastIndexOf('/') + 1);
  let [host, port] = address.split(':');
  return new Promise((resolve) => {
    let client = Client.create();
    client.on('error', socket => {
      socket.destroy();
      resolve(false);
    });
    client.connect({port, host}).then(socket => {
      socket.destroy();
      resolve(true);
    });
  }).timeout(5 * 1000)
  .catch(() => {
    return false;
  });
}
module.exports = isAlive;
