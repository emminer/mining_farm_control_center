const builder = require('./ethermine_flypool');
const endpoint = 'https://api.ethermine.org';

module.exports = builder('ethermine', endpoint, 'MH/s', function(hashrate){
  return (hashrate / 1000 / 1000).toFixed(1);
});
