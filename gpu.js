const ssh = require('./ssh');
const Promise = require('bluebird');
const config = require('./config');

const NVIDIA_QUERY = 'index,temperature.gpu,fan.speed,utilization.gpu';

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
  if (rig.gpuType === 'nvidia') {
    let rigUser = rig.platform === 'linux' ? 'm1' : config.windows_user;
    return ssh(rig.ip, rigUser, `nvidia-smi --format=csv,noheader,nounits --query-gpu=${NVIDIA_QUERY}`)
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
