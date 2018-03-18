const builder = require('./mph_suprnova');

module.exports = builder('mph_zen')('zencash', 'kH/s', function(hashrate){
  return Math.round(hashrate * 10) / 10;
});
