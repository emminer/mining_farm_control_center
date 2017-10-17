const Promise = require('bluebird');
const ethermine = require('./ethermine');
const flypool_zcash = require('./flypool_zcash');
const mph_zcash = require('./mph_zcash');
const mph_zcoin = require('./mph_zcoin');
const suprnova_bsd = require('./suprnova_bsd');
const suprnova_mona = require('./suprnova_mona');
const yiimp = require('./yiimp');
const ethfans = require('./ethfans');
const f2pool_eth = require('./f2pool_eth');
const nanopool_eth = require('./nanopool_eth');

const PoolError = require('./poolError');

function NotSupported() {
  return Promise.reject(new PoolError('Pool is not supported yet.', 404));
}

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
  } else if (pool === 'suprnova_mona') {
    return suprnova_mona;
  } else if (pool === 'yiimp_bsd' || pool === 'yiimp_lux') {
    return yiimp(pool, 'MH/s');
  } else if (pool === 'ethfans') {
    return ethfans;
  } else if (pool === 'f2pool_eth') {
    return f2pool_eth;
  } else if (pool === 'nanopool_eth') {
    return nanopool_eth;
  }

  return NotSupported;
};
