'use strict';

const TransitProvider = require('../../providers/transit');

/**
 * Route handler for Transit secrets
 * @param {StorageService} storage
 * @returns {function}
 */
function Transit(storage) {
  return (req, res, next) => {
    storage.lookup(req.params.token, req.body, TransitProvider)
      .then((result) => {
        // Check for both undefined and null. `!= null` handles both cases.
        if (result != null && result.hasOwnProperty('plaintext')) { // eslint-disable-line eqeqeq
          result.plaintext = Buffer.from(result.plaintext, 'base64').toString();
        }
        res.json(result);
      })
      .catch(next);
  };
}

module.exports = Transit;
