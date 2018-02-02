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
const nanopool_xmr = require('./nanopool_xmr');
const supportxmr = require('./supportxmr');
const nicehash = require('./nicehash');
const suprnova_zer = require('./suprnova_zer');
const ahashpool = require('./ahashpool');
const protopool = require('./protopool');
const suprnova_race = require('./suprnova_race');

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
  } else if (pool === 'suprnova_zer') {
    return suprnova_zer;
  } else if (pool === 'suprnova_race') {
    return suprnova_race;
  } else if (pool === 'yiimp_bsd' || pool === 'yiimp_lux') {
    return yiimp(pool, 'MH/s');
  } else if (pool === 'protopool_liz') {
    return protopool(pool, 'Gh/s');
  } else if (pool.startsWith('ahashpool')) {
    return ahashpool(pool, 'MH/s');
  } else if (pool === 'ethfans') {
    return ethfans;
  } else if (pool === 'f2pool_eth') {
    return f2pool_eth;
  } else if (pool === 'nanopool_eth') {
    return nanopool_eth;
  } else if (pool === 'supportxmr') {
    return supportxmr(pool, 'kH/s');
  } else if (pool === 'nanopool_xmr') {
    return nanopool_xmr;
  } else if (pool === 'nicehash_CryptoNight') {
    return nicehash('nicehash_CryptoNight')('CryptoNight', 'kH/s');
  } else if (pool === 'nicehash_Lyra2REv2') {
    return nicehash('nicehash_Lyra2REv2')('Lyra2REv2', 'MH/s');
  } else if (pool === 'nicehash_NeoScrypt') {
    return nicehash('nicehash_NeoScrypt')('NeoScrypt', 'MH/s');
  } else if (pool === 'nicehash_Nist5') {
    return nicehash('nicehash_Nist5')('Nist5', 'MH/s');
  } else if (pool === 'nicehash_auto_switch') {
    return nicehash('nicehash_auto_switch')('auto', 'auto');
  }

  return NotSupported;
};
