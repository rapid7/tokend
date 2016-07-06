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
   * @param {function} callback
   */
  initialize(callback) {
    callback(null, true);
  }

  /**
   * Renew the credentials
   * @param {function} callback
   */
  renew(callback) {
    callback(null, true);
  }
}

module.exports = CredentialProvider;
