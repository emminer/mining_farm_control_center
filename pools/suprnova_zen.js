const builder = require('./mph_suprnova');

module.exports = builder('suprnova_zen')('zen', 'kH/s', function(hashrate){
  return Math.round(hashrate / 1000 / 10) / 100;
});
