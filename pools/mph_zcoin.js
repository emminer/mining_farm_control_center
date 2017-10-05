const builder = require('./mph_suprnova');

module.exports = builder('mph_zcoin')('zcoin', 'MH/s', function(hashrate){
  return Math.round(hashrate / 100) / 10;
});
