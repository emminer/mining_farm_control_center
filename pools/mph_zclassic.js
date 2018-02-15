const builder = require('./mph_suprnova');

module.exports = builder('mph_zclassic')('zclassic', 'kH/s', function(hashrate){
  return Math.round(hashrate * 10) / 10;
});
