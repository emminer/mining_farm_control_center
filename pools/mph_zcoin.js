const builder = require('./miningPoolHub');

module.exports = builder('zcoin', 'MH/s', function(hashrate){
  return Math.round(hashrate / 100) / 10;
});
