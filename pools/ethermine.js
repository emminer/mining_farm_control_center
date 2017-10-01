const builder = require('./ethermine_flypool');
const endpoint = 'https://api.ethermine.org';

module.exports = builder('ethermine', endpoint, 'MH/s', function(hashrate){
  return Math.round(hashrate / 1000 / 100) / 10;
}, true);
