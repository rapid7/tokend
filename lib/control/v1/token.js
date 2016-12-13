'use strict';

const TokenProvider = require('../../providers/token');

/**
 * Route handler for Tokens
 * @param {StorageService} storage
 * @returns {function}
 */
function Token(storage) {
  return (req, res, next) => {
    storage.lookup('default', 'default', TokenProvider)
      .then((result) => {
        if (result != null && result.hasOwnProperty('correlation_id')) { // eslint-disable-line eqeqeq
          res.correlationId = result.correlation_id;
          delete result.correlation_id;
        }

        res.json(result);
      }).catch(next);
  };
}

module.exports = Token;
