'use strict';

const started = Date.now();
const appInfo = require('../../../package');

module.exports = (req, res) => {
  res.json({
    status: 'foo',
    uptime: Date.now() - started,
    version: appInfo.version
  });
};
