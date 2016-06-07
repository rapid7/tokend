'use strict';

const started = Date.now();
const VERSION = require('../../../package').version;

module.exports = (req, res) => {
  res.json({
    status: 'foo',
    uptime: Date.now() - started,
    version: VERSION
  });
};
