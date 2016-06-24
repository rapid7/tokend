'use strict';

const TokenProvider = require('../../providers/token');

function Token(storage) {
  return (req, res) => {
    storage.lookup('/v1/token/default', TokenProvider, (err, result) => {
      const response = (err) ? {error: err.message} : result;

      res.json(response);
    });
  };
}

module.exports = Token;
