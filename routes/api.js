const express = require('express');
const router = express.Router();
const config = require('../config');
const ApiError = require('./apiError');
const basicAuth = require('express-basic-auth');

const users = {};
users[config.api.user] = config.api.password;
const auth = basicAuth({
  users,
});

router.get('/rigs/:rigname', function(req, res, next) {
  let name = req.params.rigname;
  let rig = config.rigs.filter(r => r.name === name);
  if (rig.length === 0) {
    return next(ApiError.NotFound('rig'));
  }

  rig = rig[0];
  res.send(`${rig.coin} ${rig.pool.address} ${rig.pool.miner}`);
});

router.post('/rigs/:rigname/shutdown', auth, function(req, res, next) {
  res.send('OK');
});

router.post('/rigs/:rigname/startup', auth, function(req, res, next) {
  res.send('OK');
});

router.post('/rigs/:rigname/reset', auth, function(req, res, next) {
  res.send('OK');
});

router.post('/rigs/:rigname/online', auth, function(req, res, next) {
  res.send('OK');
});

router.post('/rigs/:rigname/offline', auth, function(req, res, next) {
  res.send('OK');
});

module.exports = router;
