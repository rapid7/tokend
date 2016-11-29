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
        res.json(result);
      }).catch(next);
  };
}

module.exports = Token;
