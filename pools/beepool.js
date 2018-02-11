const moment = require('moment');
const cheerio = require('cheerio');
const rp = require('request-promise');
const errors = require('request-promise/errors');
const PoolError = require('./poolError');
const logger = require('../logger');

module.exports = function(poolName, unit, coin) {
  return function(wallet) {
    let options = {
      uri: `http://${coin}.beepool.org/miner/${wallet}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
      }
    };
    return rp(options).then(body => {
      let $ = cheerio.load(body);
      let now = moment();
      let table = $('table').first();
      let rows = table.find('> tbody > tr');
      let rigs = [];
      try{
        rows.each((index, row) => {
          let worker = $(row).children().eq(0).html();
          let hashrate = $(row).children().eq(1).html().replace('GH/S', '');
          hashrate = parseFloat(hashrate);
          rigs.push({
            name: worker,
            poolName,
            lastSeen: now,
            hashrate: {
              unit,
              current: hashrate,
            }
          });
        });
      } catch(parseErr) {
        logger.error(parseErr);
        logger.info('beepool html:', body);
        throw new PoolError('beepool parse error');
      }
      return rigs;
    }).catch(errors.StatusCodeError, reason => {
      throw new PoolError(reason.message, reason.statusCode, reason.error);
    }).catch(errors.RequestError, reason => {
      throw PoolError.NetworkError(reason.message);
    });
  };
};
