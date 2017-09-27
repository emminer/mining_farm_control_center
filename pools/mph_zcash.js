const builder = require('./miningPoolHub');

module.exports = builder('zcash', 'kH/s', function(hashrate){
  return hashrate.toFixed(1);
});
