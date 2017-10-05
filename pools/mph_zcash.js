const builder = require('./mph_suprnova');

module.exports = builder('mph_zcash')('zcash', 'kH/s', function(hashrate){
  return Math.round(hashrate * 10) / 10;
});
