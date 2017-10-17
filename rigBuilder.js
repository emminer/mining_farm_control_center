const Promise = require('bluebird');
const logger = require('./logger');

if (process.env.MFCC_DRY_RUN === 'true') {
  logger.info('DRY RUN');
}

const fake = {
  startup: function(pin){
    logger.info(`GPIO startups pin ${pin}`);
    return Promise.resolve('');
  },
  shutdown: function(pin) {
    logger.info(`GPIO shutdown pin ${pin}`);
    return Promise.resolve('');
  },
  restart: function(pin){
    logger.info(`GPIO restarts pin ${pin}`);
    return Promise.delay(10 * 1000);
  },
  restart_try_soft: function(ip, pin) {
    logger.info(`soft reset ip ${ip}, pin ${pin}`);
    return Promise.delay(2 * 1000).then(() => 'soft');
  }
};

module.exports = function() {
  if (process.env.MFCC_DRY_RUN === 'true') {
    return fake;
  }
  return process.env.NODE_ENV === 'production' ? require('./rig') : fake;
};
