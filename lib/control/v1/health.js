'use strict';

const started = Date.now();
const VERSION = require('../../../package').version;

module.exports = (req, res) => {
  // TODO: Actually determine how to figure out the status
  res.json({
    status: 'foo',
    uptime: Date.now() - started,
    version: VERSION
  });
};
