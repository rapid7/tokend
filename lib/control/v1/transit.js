'use strict';

const TransitProvider = require('../../providers/transit');

function Transit(storage) {
  return (req, res, next) => {
    storage.lookup(req.params.token, req.body, TransitProvider)
    .then((result) => {
      // Check for both undefined and null. `!= null` handles both cases.
      if (result != null && result.hasOwnProperty('plaintext')) {
        result.plaintext = Buffer.from(result.plaintext, 'base64').toString();
      }
      res.json(result);
    })
    .catch(next);
  }
}

module.exports = Transit;
