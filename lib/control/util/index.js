'use strict';
const STATUS_CODES = require('./status-codes');

const Handlers = {
  allowed(methods) {
    return (req, res) => {
      res.set('Allow', methods);
      res.status(STATUS_CODES.METHOD_NOT_ALLOWED);
      res.end();
    };
  }
};

const Err = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const error = {
    error: {
      name: err.name,
      message: err.message
    }
  };
  const statusCode = err.statusCode || STATUS_CODES.BAD_REQUEST;

  // Include response headers if it's a HTTP error
  if (err.response) {
    const defaultHeaders = {
      Accept: 'application/json',
      'Accept-Charset': 'utf-8'
    };

    error.error.headers = Object.assign(defaultHeaders, err.response.headers);
  }

  res.status(statusCode);
  res.json(error);
};

const VerifyHeader = (header, value) => ((req, res, next) => {
  const h = req.headers[header.toLowerCase()];

  if (h && h === value) {
    return next();
  }

  // Throw exception here to unearth issues
  const err = new TypeError(`${header} must be \`${value}\`.`);

  err.statusCode = STATUS_CODES.BAD_REQUEST;
  throw err;
});

module.exports = {
  Handlers,
  Err,
  VerifyHeader
};
