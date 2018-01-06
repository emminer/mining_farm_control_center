const moment = require('moment');
const { get } = require('../request');
const errors = require('request-promise/errors');
const PoolError = require('./poolError');

module.exports = function(poolName) {
  return function(algo, unit, hashrateHandler){
    return function(miner) {
      if (!hashrateHandler) {
        hashrateHandler = o => o;
      }
      let timestamp = moment().unix();
      let algoCode = algo2code(algo);
      let url = `https://api.nicehash.com/api?method=stats.provider.workers&addr=${miner}&_ts=${timestamp}`;
      if (algoCode !== -1) {
        url += `&algo=${algoCode}`;
      }

      return get(url).then(resp => {
        if (!resp.result) {
          throw new PoolError('nicehash error: no result', 500);
        } else if (resp.result.error) {
          throw new PoolError(`nicehash error: ${resp.result.error}`, 500);
        }

        return (resp.result.workers || []).map(worker => {
          return {
            name: worker[0],
            algo: code2algo(worker[worker.length - 1]),
            poolName,
            lastSeen: moment(),
            hashrate: {
              unit,
              current: worker[1].a ? hashrateHandler(parseFloat(worker[1].a)) : 0,
              avg24h: worker[1].a ? hashrateHandler(parseFloat(worker[1].a)) : 0,
            },
          };
        });
      }).catch(errors.StatusCodeError, reason => {
        throw new PoolError(reason.message, reason.statusCode, reason.error);
      }).catch(errors.RequestError, reason => {
        throw PoolError.NetworkError(reason.message);
      });
    };
  };
};

function algo2code(algo) {
  for (const pair of NICEHASH_ALGO_MAP) {
    if (pair[1] === algo) {
      return pair[0];
    }
  }

  return -1;
}

function code2algo(code) {
  for (const pair of NICEHASH_ALGO_MAP) {
    if (pair[0] === code) {
      return pair[1];
    }
  }

  return 'unknown';
}

const NICEHASH_ALGO_MAP = [
  [0, 'Scrypt'],
  [1, 'SHA256'],
  [2, 'ScryptNf'],
  [3, 'X11'],
  [4, 'X13'],
  [5, 'Keccak'],
  [6, 'X15'],
  [7, 'Nist5'],
  [8, 'NeoScrypt'],
  [9, 'Lyra2RE'],
  [10, 'WhirlpoolX'],
  [11, 'Qubit'],
  [12, 'Quark'],
  [13, 'Axiom'],
  [14, 'Lyra2REv2'],
  [15, 'ScryptJaneNf16'],
  [16, 'Blake256r8'],
  [17, 'Blake256r14'],
  [18, 'Blake256r8vnl'],
  [19, 'Hodl'],
  [20, 'DaggerHashimoto'],
  [21, 'Decred'],
  [22, 'CryptoNight'],
  [23, 'Lbry'],
  [24, 'Equihash'],
  [25, 'Pascal'],
  [26, 'X11Gost'],
  [27, 'Sia'],
  [28, 'Blake2s'],
  [29, 'Skunk'],
];
