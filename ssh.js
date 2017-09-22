const os = require('os');
const path = require('path');
const fs = require('fs');
const SSH = require('simple-ssh');
const Promise = require('bluebird');

const CONNECTION_TIMEOUT = 3000;
const RUN_TIMEOUT = 5000;

module.exports = function(host, user, command) {
  let ssh = new SSH({
    host,
    user,
    timeout: CONNECTION_TIMEOUT,
    key: fs.readFileSync(path.join(os.homedir(), '.ssh/id_rsa')),
  });

  return new Promise((resolve, reject) => {
    ssh.exec(command, {
      exit: (code, stdout, stderr) => {
        if (code !== 0) {
          let err = new Error(`command ${command} exits with code ${code}`);
          err.sshExitCode = code;
          err.stderr = stderr;
          return reject(err);
        }

        resolve(stdout);
      },
    }).start({
      fail: (err) => {
        reject(err);
      }
    });
  })
  .timeout(RUN_TIMEOUT)
  .catch(Promise.TimeoutError, (errt) => {
    ssh.end();
    throw errt;
  });
}
