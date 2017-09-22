const ssh = require('./ssh');

const query = 'index,temperature.gpu,fan.speed,utilization.gpu';

function parseLine(data) {
  const arr = data.split(',');
  return {
    i: +(arr[0]),
    temp: +(arr[1]),
    fan: +(arr[2]),
    util: +(arr[3]),
  };
}

module.exports = function(rigIp) {
  return ssh(rigIp, 'm1', `nvidia-smi --format=csv,noheader,nounits --query-gpu=${query}`)
  .then(stdout => {
    return stdout.split('\n').filter(l => (l.indexOf(',') > 0)).map(parseLine);
  });
};
