const ProgressBar = require('progress');
const Promise = require('bluebird');

module.exports = function delayWithProgress(seconds) {
  let mins = Math.ceil(seconds / 60);
  return new Promise(function(resolve) {
    let bar = new ProgressBar(`  sleeping ${mins} mins [:bar] :percent`, { total: 100 });
    let timer = setInterval(() => {
      bar.tick();
      if (bar.complete) {
        resolve();
        clearInterval(timer);
      }
    }, seconds / 100 * 1000);
  });
}
