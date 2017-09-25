const express = require('express');
const router = express.Router();
const _ = require('lodash');
const config = require('../config');
const ApiError = require('./apiError');
const basicAuth = require('express-basic-auth');

const users = {};
users[config.api.user] = config.api.password;
const auth = basicAuth({
  users,
  unauthorizedResponse: getUnauthorizedResponse,
});

function getUnauthorizedResponse(req) {
  return req.auth ?
      ('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected') :
      'No credentials provided';
}

const monitor = require('../rig_monitor');
const rigGPIO = require('../rigBuilder')();

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
  let name = req.params.rigname;
  let rig = _.find(monitor.RIGS, r => r.name === name);
  if (!rig) {
    return res.status(404).send('rig not found.');
  }

  rigAction(res, next, rigGPIO.shutdown(rig.pin));
});

router.post('/rigs/:rigname/startup', auth, function(req, res, next) {
  let name = req.params.rigname;
  let rig = _.find(monitor.RIGS, r => r.name === name);
  if (!rig) {
    return res.status(404).send('rig not found.');
  }

  rigAction(res, next, rigGPIO.startup(rig.pin));
});

router.post('/rigs/:rigname/reset', auth, function(req, res, next) {
  let name = req.params.rigname;
  let rig = _.find(monitor.RIGS, r => r.name === name);
  if (!rig) {
    return res.status(404).send('rig not found.');
  }

  rigAction(res, next, rigGPIO.restart(rig.pin));
});

router.post('/rigs/:rigname/online', auth, function(req, res, next) {
  let name = req.params.rigname;
  let rig = _.find(monitor.RIGS, r => r.name === name);
  if (!rig) {
    return res.status(404).send('rig not found.');
  }
  rig.offline = false;
  rig.lastAction = null;
  rig.startedAt = null;
  res.send('OK');
});

router.post('/rigs/:rigname/offline', auth, function(req, res, next) {
  let name = req.params.rigname;
  let rig = _.find(monitor.RIGS, r => r.name === name);
  if (!rig) {
    return res.status(404).send('rig not found.');
  }
  rig.offline = true;
  res.send('OK');
});

function rigAction(res, next, promise) {
  if (monitor.lock()){
    promise
    .then(() => {
      res.send('OK');
    })
    .catch(err => {
      next(err);
    })
    .finally(() => {
      monitor.unlock();
    });
  } else {
    res.status(503).send('Server is busy, try again later.');
  }
}

module.exports = router;
