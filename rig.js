const rpio = require('rpio');
const Promise = require('bluebird');
const ssh = require('./ssh');
const logger = require('./logger');

const shutdown_press_seconds = 5;
const startup_press_ms = 100;
const restart_delay_seconds = 10;

function shutdown(pin, close) {
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

function restart_try_soft(ip, pin) {
  return ssh(ip, 'm1', 'sudo reboot')
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
