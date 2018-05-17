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
        return res.json(result);
      }

      let data = {};

      // Handle a case where the result set has a nested data object
      if (result.hasOwnProperty('data')) {
        data = normalizeKeys(result.data);
      }

      // If the data returned has a plaintext property convert it from base64
      if (data.hasOwnProperty('plaintext')) { // eslint-disable-line eqeqeq
        data.plaintext = Buffer.from(data.plaintext, 'base64').toString();
      }

      res.json(data);
    }).catch(next);
  };
}

module.exports = KMS;
