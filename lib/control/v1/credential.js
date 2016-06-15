'use strict';

const CredentialProvider = require('../../providers/credential');

function Credential(storage) {
  return (req, res) => {
    const token = req.params.token;
    const mount = req.params.mount;
    const role = req.params.role;

    storage.lookup(`/v1/credential/${token}/${mount}/${role}`, CredentialProvider, (err, result) => {
      const response = (err) ? {error: err.message} : result;

      res.json(response);
    });
  };
}

module.exports = Credential;