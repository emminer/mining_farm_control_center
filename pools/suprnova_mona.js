const builder = require('./mph_suprnova');

module.exports = builder('suprnova_mona')('mona', 'MH/s', function(hashrate){
  return Math.round(hashrate / 10) / 100;
});
