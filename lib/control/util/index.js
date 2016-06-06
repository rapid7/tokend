'use strict';
const STATUS_CODES = require('./status-codes');

const Handlers = {
  allowed(methods) {
    return (req, res) => {
      res.set('Allow', methods);
      res.status(STATUS_CODES.METHOD_NOT_ALLOWED);
      res.end();
    }
  }
};

module.exports = {
  Handlers
};
