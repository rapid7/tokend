'use strict';

const KMSProvider = require('../../providers/kms');

/**
 * Route handler for KMS secrets
 * @param {StorageService} storage
 * @returns {function}
 */
function KMS(storage) {
  return (req, res, next) => {
    // KMS doesn't require a token so we can just pass an empty string
    storage.lookup('', req.body, KMSProvider)
      .then((result) => {
        if (result) {
          Object.keys(result).forEach((key) => {
            result[key.toLowerCase()] = result[key];
            if (key.toLowerCase() !== key) {
              delete result[key];
            }
          });
        }
        // Check for both undefined and null. `!= null` handles both cases.
        if (result != null && result.hasOwnProperty('plaintext')) { // eslint-disable-line eqeqeq
          result.plaintext = Buffer.from(result.plaintext, 'base64').toString();
        }

        if (result != null && result.hasOwnProperty('correlation_id')) { // eslint-disable-line eqeqeq
          res.correlationId = result.correlation_id;
          delete result.correlation_id;
        }

        res.json(result);
      })
      .catch(next);
  };
}

module.exports = KMS;
