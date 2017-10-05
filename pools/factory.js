const ethermine = require('./ethermine');
const flypool_zcash = require('./flypool_zcash');
const mph_zcash = require('./mph_zcash');
const mph_zcoin = require('./mph_zcoin');
const suprnova_bsd = require('./suprnova_bsd');

module.exports = function(pool) {
  if (pool === 'ethermine') {
    return ethermine;
  } else if (pool === 'flypool_zcash') {
    return flypool_zcash;
  } else if (pool === 'mph_zcash') {
    return mph_zcash;
  } else if (pool === 'mph_zcoin') {
    return mph_zcoin;
  } else if (pool === 'suprnova_bsd') {
    return suprnova_bsd;
  }
}
