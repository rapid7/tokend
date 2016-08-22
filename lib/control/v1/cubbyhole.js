'use strict';

const CubbyHoleProvider = require('../../providers/cubbyhole');

function CubbyHole(storage) {
  return (req, res) => {
    const token = req.params.token;
    const path = req.params.path;

    storage.lookup(token, path, CubbyHoleProvider)
      .then((result) => res.json(result))
      .catch((err) => res.json({error: err.message}));
  };
}

module.exports = CubbyHole;
