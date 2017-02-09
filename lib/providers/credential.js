'use strict';

/**
 * Provider for Credential secrets
 */
class CredentialProvider {
    /**
   * Create a new instance of the `GenericProvider`.
   *
   * @param {string} path
   * @param {string} token
   */
  constructor(path, token) {
    const splitPath = path.split('/');

    this.mount = splitPath[0];
    this.role = splitPath[1];
    this.token = token;
    this.data = null;
  }

  /**
   * Initialize the credentials
   * @returns {Promise}
   */
  initialize() {
    return Promise.resolve(true);
  }

  /**
   * Renew the credentials
   * @returns {Promise}
   */
  renew() {
    return Promise.resolve(true);
  }

  /**
   * Removes cached data
   */
  invalidate() {
    this.data = null;
  }

  /**
   * Does the provider require a Vault token
   */
  requireVaultToken() { }
}

module.exports = CredentialProvider;
