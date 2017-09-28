const builder = require('./ethermine_flypool');
const endpoint = 'https://api-zcash.flypool.org';

module.exports = builder('flypool_zcash', endpoint, 'kH/s', function(hashrate){
  return (hashrate / 1000).toFixed(1);
}, false);
