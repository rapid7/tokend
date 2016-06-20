'use strict';

const SecretProvider = require('../../providers/secret');

function Secret(storage) {
  return (req, res) => {
    const token = req.params.token;
    const path = req.params.path;

    storage.lookup(`/v1/secret/${token}/${path}`, SecretProvider, (err, result) => {
      const response = (err) ? {error: err.message} : result;

      res.json(response);
    });
  };
}

module.exports = Secret;
