var rpio = require('rpio');
var Promise = require('bluebird');

const shutdown_press_seconds = 5;
const startup_press_ms = 100;
const restart_delay_seconds = 5;

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

module.exports = { shutdown, startup, restart };
