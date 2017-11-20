const builder = require('./nanopool');

module.exports = builder('nanopool_xmr')('xmr', 'kH/s', function(hashrate){
  return Math.round(hashrate / 100) / 10;
});
