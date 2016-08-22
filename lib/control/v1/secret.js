'use strict';

const SecretProvider = require('../../providers/secret');

function Secret(storage) {
  return (req, res) => {
    const token = req.params.token;
    const path = req.params.path;

    storage.lookup(token, path, SecretProvider)
      .then((result) => res.json(result))
      .catch((err) => res.json({error: err.message}));
  };
}

module.exports = Secret;
