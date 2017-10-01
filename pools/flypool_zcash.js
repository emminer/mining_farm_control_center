const builder = require('./ethermine_flypool');
const endpoint = 'https://api-zcash.flypool.org';

module.exports = builder('flypool_zcash', endpoint, 'kH/s', function(hashrate){
  return Math.round(hashrate / 100) / 10;
}, false);
