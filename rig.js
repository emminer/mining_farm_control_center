const rpio = require('rpio');
const Promise = require('bluebird');
const ssh = require('./ssh');
const logger = require('./logger');
const config = require('./config');

const shutdown_press_seconds = 5;
const startup_press_ms = 100;
const restart_delay_seconds = 10;

function shutdown(pin, close) {
  if (pin === '0' || pin === 0) {
    return Promise.resolve();
  }
  rpio.open(pin, rpio.OUTPUT, rpio.LOW);
  return Promise.delay(shutdown_press_seconds * 1000).then(() => {
    if (close) {
      rpio.close(pin);
    } else {
      rpio.write(pin, rpio.HIGH);
    }
  });
}

function startup(pin) {
  if (pin === '0' || pin === 0) {
    return Promise.resolve();
  }
  rpio.open(pin, rpio.OUTPUT, rpio.LOW);
  return Promise.delay(startup_press_ms).then(() => {
    rpio.close(pin);
  });
}

function restart(pin) {
  return shutdown(pin, false).then(() => {
    return Promise.delay(restart_delay_seconds * 1000);
  }).then(() => {
    return startup(pin);
  });
}

function restart_try_soft(ip, pin, platform, gpuType) {
  let softRebootPromise;
  if (platform === 'linux' && gpuType === 'nvidia') {
    softRebootPromise = ssh(ip, 'm1', 'sudo reboot');
  } else if (platform === 'windows' && gpuType === 'amd') {
    softRebootPromise = ssh(ip, config.windows_user, 'shutdown -t 0 -r -f');
  } else {
    softRebootPromise = Promise.resolve();
  }
  return softRebootPromise
    .then(() => {
      return 'soft';
    })
    .catch(err => {
      logger.error(`soft reset ${ip} failed, `, err);
      return restart(pin).then(() => {
        return 'hard';
      });
    });
}

module.exports = { shutdown, startup, restart, restart_try_soft };
