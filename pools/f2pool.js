const moment = require('moment');
const cheerio = require('cheerio');
const rp = require('request-promise');
const errors = require('request-promise/errors');
const PoolError = require('./poolError');
const logger = require('../logger');

module.exports = function(poolName, unit) {
  return function(wallet) {
    let options = {
      uri: `https://www.f2pool.com/eth/${wallet}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
      }
    };
    return rp(options).then(body => {
      let $ = cheerio.load(body);
      let now = moment();
      let table = $('#workers');
      let rows = table.find('> tbody > tr');
      let rigs = [];
      try{
        rows.each((index, row) => {
          let children = $(row).children();
          let name = children.eq(0).html();
          let hashrate = children.eq(1).html().split(' ')[0];
          hashrate = (hashrate && hashrate !== '-') ? parseFloat(hashrate) : 0;
          let hashrate1d = children.eq(4).html().split(' ')[0];
          hashrate1d = (hashrate1d && hashrate1d !== '-') ? parseFloat(hashrate1d) : 0;
          let lastSeen = children.eq(6).html();
          let match = lastSeen.match(/Date\(([\d.]+)\)/);
          if (match) {
            lastSeen = moment.unix(match[1]);
          } else {
            lastSeen = now;
          }

          rigs.push({
            name,
            poolName,
            lastSeen,
            hashrate: {
              unit,
              current: hashrate,
              avg24h: hashrate1d,
            }
          });
        });
      } catch(parseErr) {
        logger.error(parseErr);
        logger.info('f2pool html:', body);
        throw new PoolError('f2pool parse error');
      }
      return rigs;
    }).catch(errors.StatusCodeError, reason => {
      throw new PoolError(`StatusCodeError ${poolName} code: ${reason.statusCode}`, reason.statusCode);
    }).catch(errors.RequestError, reason => {
      throw PoolError.NetworkError(reason.message);
    });
  };
};
