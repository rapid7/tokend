'use strict';

const CredentialProvider = require('../../providers/credential');

function Credential(storage) {
  return (req, res) => {
    const token = req.params.token;
    const mount = req.params.mount;
    const role = req.params.role;

    storage.lookup(token, `${mount}/${role}`, CredentialProvider)
      .then((result) => res.json(result))
      .catch((err) => res.json({error: err.message}));
  };
}

module.exports = Credential;
