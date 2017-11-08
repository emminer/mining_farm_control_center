const ssh = require('./ssh');
const Promise = require('bluebird');
const config = require('./config');

const query = 'index,temperature.gpu,fan.speed,utilization.gpu';

function parseLineLinuxNvidia(data) {
  const arr = data.split(',');
  return {
    index: +(arr[0]),
    temp: +(arr[1]),
    fan: +(arr[2]),
    util: +(arr[3]),
  };
}

function parseLineWindowsAmd(data) {
  const arr = data.split(',');
  return {
    index: +(arr[0]),
    temp: +(arr[2]),
    fan: +(arr[3]),
    util: 0,
  };
}

module.exports = function(rig) {
  if (rig.platform === 'linux' && rig.gpuType === 'nvidia') {
    return ssh(rig.ip, 'm1', `nvidia-smi --format=csv,noheader,nounits --query-gpu=${query}`)
      .then(stdout => {
        return stdout.split('\n').filter(l => (l.indexOf(',') > 0)).map(parseLineLinuxNvidia);
      });
  } else if (rig.platform === 'windows' && rig.gpuType === 'amd') {
    return ssh(rig.ip, config.windows_user, config.windows_adli_path)
      .then(stdout => {
        return stdout.split('\n').filter(l => l.indexOf(',') > 0).map(parseLineWindowsAmd);
      });
  } else {
    return Promise.resolve([]);
  }
};
