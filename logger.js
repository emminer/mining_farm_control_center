var winston = require('winston');
var dateFormat = require('dateformat');
var winston_log_level = process.env.LOG_LEVEL || 'debug';
console.log(`winston log level is ${winston_log_level}`);
var logger = new (winston.Logger)({
transports: [
  new (winston.transports.Console)({timestamp: function() {
        return dateFormat(new Date, 'mm-dd HH:MM:ss');
      }, level: winston_log_level})
]
});

module.exports = logger;
