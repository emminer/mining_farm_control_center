const express = require('express');
const router = express.Router();
const config = require('../config');
const ApiError = require('./apiError');

router.get('/rigs/:rigname', function(req, res, next) {
  let name = req.params.rigname;
  let rig = config.rigs.filter(r => r.name === name);
  if (rig.length === 0) {
    return next(ApiError.NotFound('rig'));
  }

  rig = rig[0];
  res.send(`${rig.coin} ${rig.pool.address} ${rig.pool.miner}`);
});

module.exports = router;
