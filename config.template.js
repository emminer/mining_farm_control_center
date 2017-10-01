const suprnova = {
  miner: 'suprnova_user'
  apikey: 'api_key',
};
const miningpoolhub = {
  miner: 'mph_user',
  apikey: 'api_key',
};
const check_rigs_time_minutes = 5;
const check_gpu_interval_minutes = 10;
const report_status_endpoint = 'http://localhost:3009/api/farms/status';
const report_status_token = 'token';
const api = {
  user: 'alice',
  password: 'wieru87fsx',
}

const rigs = [
  {name: 'nv100', ip: '192.168.1.100', pin: '8', coin: 'ETH', pool: 'ethermine', min_hashrate: 1800, watts: 900},
  {name: 'nv101', ip: '127.0.0.1', pin: '10', coin: 'ETH', pool: 'ethermine', min_hashrate: 180, watts: 1000},
  //{name: 'nv167', ip: '192.168.1.167', pin: '12', coin: 'ETH', pool: 'ethermine', min_hashrate: 190, watts: 1200},
  {name: 'nv129', ip: '10.0.0.129', pin: '3', coin: 'ZEC', pool: 'flypool_zcash', min_hashrate: 1.5, watts: 900},
];

const pools = [
  {name: 'ethermine', miner: '89fea85a0a5a6a8a2b397d82f57e920010008a90', address: 'asia1.ethermine.org:14444', delay_minutes: 30},
  {name: 'flypool_zcash', miner: 't1JCUbGtCRCkbegXcLWzq3uYKmrLa2PGVco', address: 'cn1-zcash.flypool.org:3333', delay_minutes: 30},
  {name: 'suprnova_sigt', miner: suprnova.miner, address: 'stratum+tcp://sigt.suprnova.cc:7106', delay_minutes: 30},
  {name: 'suprnova_lbry', miner: suprnova.miner, address: 'stratum+tcp://lbry.suprnova.cc:6256', delay_minutes: 30},
  {name: 'mph_zcash', miner: miningpoolhub.miner, apikey: miningpoolhub.apikey, address: 'stratum+tcp://hub.miningpoolhub.com:20527', delay_minutes: 40}
];

//DO NOT EDIT BELOW THIS LINE

module.exports = {
  check_rigs_time_minutes,
  check_gpu_interval_minutes,
  report_status_endpoint,
  report_status_token,
  api,
  rigs: rigs.map(rig => {
    rig.pool = pools.filter(p => p.name === rig.pool)[0];
    rig.status = 'unknown';
    return rig;
  }),
  pools,
}
