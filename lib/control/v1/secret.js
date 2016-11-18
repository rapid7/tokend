'use strict';

const SecretProvider = require('../../providers/secret');

/**
 * Route handler for Generic secrets
 * @param {StorageService} storage
 * @returns {function}
 */
function Secret(storage) {
  return (req, res, next) => {
    const token = req.params.token;
    const path = req.params.path;

    storage.lookup(token, path, SecretProvider)
      .then((result) => {
        res.json(result);
      }).catch(next);
  };
}

module.exports = Secret;
