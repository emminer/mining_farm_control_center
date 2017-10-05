const builder = require('./mph_suprnova');

module.exports = builder('suprnova_bsd')('bsd', 'MH/s', function(hashrate){
  return Math.round(hashrate / 10) / 100;
});
