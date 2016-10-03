'use strict';

const TransitProvider = require('../../providers/transit');

function Transit(storage) {
  return (req, res, next) => {
    storage.lookup(req.params.token, req.body, TransitProvider)
    .then((result) => {
      res.json(result);
    })
    .catch(next);
  }
}

module.exports = Transit;
