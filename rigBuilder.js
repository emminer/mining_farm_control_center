const Promise = require('bluebird');
const logger = require('./logger');

module.exports = function() {
  return process.env.NODE_ENV === 'production' ? require('./rig') : {
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
    }
  };
}
