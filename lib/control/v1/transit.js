'use strict';

const TransitProvider = require('../../providers/transit');

function Transit(storage) {
  return (req, res, next) => {
    Promise.resolve(req.body)
    .then(JSON.parse)
    .then((secret) => {
      storage.lookup(req.params.token, secret, TransitProvider)
      .then((result) => {
        res.json(result);
      });
    })
    .catch(next);
  }
}

module.exports = Transit;
