'use strict';

const CredentialProvider = require('../../providers/credential');

/**
 * Route handler for Credential secrets
 * @param {StorageService} storage
 * @returns {function}
 */
function Credential(storage) {
  return (req, res, next) => {
    const token = req.params.token;
    const mount = req.params.mount;
    const role = req.params.role;

    storage.lookup(token, `${mount}/${role}`, CredentialProvider)
      .then((result) => {
        res.json(result);
      }).catch(next);
  };
}

module.exports = Credential;
