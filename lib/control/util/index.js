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

const Err = (err, req, res, next) => {
  const error = {
    error: {
      name: err.name,
      message: err.message
    }
  };
  const statusCode = err.statusCode || STATUS_CODES.BAD_REQUEST;

  // Include response headers if it's a HTTP error
  if (err.response) {
    error.error.headers = err.response.headers;
  }

  res.status(statusCode);
  res.json(error);
};

module.exports = {
  Handlers,
  Err
};
