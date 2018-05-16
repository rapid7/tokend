'use strict';

const KMSProvider = require('../../providers/kms');

/**
 * AWS-SDK gives out weirdly formatted keys, so make them
 * consistent with formatting across the rest of Tokend
 *
 * @param {Object} obj
 * @returns {Object}
 */
const normalizeKeys = (obj) => Object.keys(obj).reduce((acc, key) => {
  acc[key.toLowerCase()] = obj[key];

  return acc;
}, {});

/**
 * Route handler for KMS secrets
 * @returns {function}
 */
function KMS() {
  return (req, res, next) => {
    (new KMSProvider(req.body)).initialize().then((result) => {
      // I don't know how we'd get a falsy `result` but we need a method for handling it
      if (!result) {
        return;
      }

      let data = {};

      // Handle a case where there's no
      if (result.hasOwnProperty('data')) {
        data = normalizeKeys(result.data);
      }

      // Check for both undefined and null. `!= null` handles both cases.
      if (data.hasOwnProperty('plaintext')) { // eslint-disable-line eqeqeq
        data.plaintext = Buffer.from(data.plaintext, 'base64').toString();
      }

      res.json(data);
    }).catch(next);
  };
}

module.exports = KMS;
