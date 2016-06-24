'use strict';

const CubbyHoleProvider = require('../../providers/cubbyhole');

function CubbyHole(storage) {
  return (req, res) => {
    const token = req.params.token;
    const path = req.params.path;

    storage.lookup(`/v1/cubbyhole/${token}/${path}`, CubbyHoleProvider, (err, result) => {
      const response = (err) ? {error: err.message} : result;

      res.json(response);
    });
  };
}

module.exports = CubbyHole;
