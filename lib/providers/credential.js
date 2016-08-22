/* global Config */
'use strict';

class CredentialProvider {
  constructor(path, token) {
    const splitPath = path.split('/');

    this.mount = splitPath[0];
    this.role = splitPath[1];
    this.token = token;
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
}

module.exports = CredentialProvider;
