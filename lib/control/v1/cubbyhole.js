'use strict';

const CubbyHoleProvider = require('../../providers/cubbyhole');

/**
 * Route handler for Cubbyhole secrets
 * @param {StorageService} storage
 * @returns {function}
 */
function CubbyHole(storage) {
  return (req, res, next) => {
    const token = req.params.token;
    const path = req.params.path;

    storage.lookup(token, path, CubbyHoleProvider)
      .then((result) => {
        res.json(result);
      }).catch(next);
  };
}

module.exports = CubbyHole;
