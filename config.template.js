const suprnova = {
  miner: 'suprnova_user'
};
const miningpoolhub = {
  miner: 'mph_user'
};
const check_rigs_time_minutes = 5;

const rigs = [
  {name: 'nv100', ip: '192.168.1.100', pin: '8', coin: 'ETH', pool: 'ethermine', min_hashrate: 1800},
  {name: 'nv101', ip: '127.0.0.1', pin: '10', coin: 'ETH', pool: 'ethermine', min_hashrate: 180},
  //{name: 'nv167', ip: '192.168.1.167', pin: '12', coin: 'ETH', pool: 'ethermine', min_hashrate: 190},
  {name: 'nv129', ip: '10.0.0.129', pin: '3', coin: 'ZEC', pool: 'flypool_zcash', min_hashrate: 1.5},
];

const pools = [
  {name: 'ethermine', miner: '89fea85a0a5a6a8a2b397d82f57e920010008a90', address: 'asia1.ethermine.org:14444'},
  {name: 'flypool_zcash', miner: 't1JCUbGtCRCkbegXcLWzq3uYKmrLa2PGVco', address: 'cn1-zcash.flypool.org:3333'},
  {name: 'suprnova_sigt', miner: suprnova.miner, address: 'stratum+tcp://sigt.suprnova.cc:7106'},
  {name: 'suprnova_lbry', miner: suprnova.miner, address: 'stratum+tcp://lbry.suprnova.cc:6256'},
  {name: 'miningpoolhub_skein', miner: miningpoolhub.miner, address: 'stratum+tcp://hub.miningpoolhub.com:20527'}
];

//DO NOT EDIT BELOW THIS LINE

module.exports = {
  check_rigs_time_minutes,
  rigs: rigs.map(rig => {
    rig.pool = pools.filter(p => p.name === rig.pool)[0];
    rig.status = 'unknown';
    return rig;
  }),
  pools,
}