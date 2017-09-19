const ethermine = require('./ethermine');
const flypool_zcash = require('./flypool_zcash');

module.exports = function(pool) {
  if (pool === 'ethermine') {
    return ethermine;
  } else if (pool === 'flypool_zcash') {
    return flypool_zcash;
  }
}
