const rp = require('request-promise');

function get(url) {
  const options = {
    uri: url,
    json: true,
  };
  return rp(options);
}

module.exports = { get };
