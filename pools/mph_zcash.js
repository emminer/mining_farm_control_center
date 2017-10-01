const builder = require('./miningPoolHub');

module.exports = builder('zcash', 'kH/s', function(hashrate){
  return Math.round(hashrate * 10) / 10;
});
