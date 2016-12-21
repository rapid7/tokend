'use strict';

/**
 * Get the Vault server default_lease_ttl
 * @param {Vaulted} client
 * @param {string} token
 * @param {string} mount
 * @returns {Promise}
 */
module.exports = {
  getDefaultLeaseTTL: (client, token, mount) => { // eslint-disable-line arrow-body-style
    return client.getMountTune({token, id: mount}).then((response) => response.default_lease_ttl);
  }
};
