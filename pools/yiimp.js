const moment = require('moment');
const cheerio = require('cheerio');
const rp = require('request-promise');
const errors = require('request-promise/errors');
const PoolError = require('./poolError');
const logger = require('../logger');

module.exports = function(poolName, unit) {
  return function(wallet) {
    let options = {
      uri: `http://yiimp.ccminer.org/site/wallet_miners_results?address=${wallet}`,
      headers: {
        Referer: `http://yiimp.ccminer.org/?address=${wallet}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
      }
    };
    return rp(options).then(body => {
      let $ = cheerio.load(body);
      let now = moment();
      let table = $('table').last();
      let rows = table.find('> tbody > tr');
      let rigs = [];
      try{
        rows.each((index, row) => {
          let extra = $(row).children().eq(1).html();
          let hashrate = $(row).children().eq(5).html().split(' ')[0];
          hashrate = (hashrate && hashrate !== '-') ? parseFloat(hashrate) : 0;
          rigs.push({
            name: extra,
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
        logger.info('yiimp html:', body);
        throw new PoolError('yiimp parse error');
      }
      return rigs;
    }).catch(errors.StatusCodeError, reason => {
      throw new PoolError(reason.message, reason.statusCode, reason.error);
    }).catch(errors.RequestError, reason => {
      throw PoolError.NetworkError(reason.message);
    });
  };
};
