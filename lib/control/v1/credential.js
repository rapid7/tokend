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
        if (result != null && result.hasOwnProperty('correlation_id')) { // eslint-disable-line eqeqeq
          res.correlationId = result.correlation_id;
          delete result.correlation_id;
        }

        res.json(result);
      }).catch(next);
  };
}

module.exports = Credential;
