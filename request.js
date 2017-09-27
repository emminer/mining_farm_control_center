const rp = require('request-promise');

function get(url) {
  const options = {
    uri: url,
    json: true,
    timeout: 10000,//10 seconds
  };
  return rp(options);
}

function post(url, token, payload, cb) {
  rp({
    url,
    method: 'POST',
    headers: {
      'FARM_TOKEN': token,
    },
    body: payload,
    json: true,
  }).then((response) => {
    cb && cb(null, response);
  }).catch(err => {
    cb && cb(err);
  });
}

module.exports = { get, post };
