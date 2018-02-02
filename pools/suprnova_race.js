const builder = require('./mph_suprnova');

module.exports = builder('suprnova_race')('race', 'MH/s', function(hashrate){
  return Math.round(hashrate / 10) / 100;
});
