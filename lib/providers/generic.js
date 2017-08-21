'use strict';

const Vault = require('node-vault');
const preconditions = require('conditional');
const checkNotEmpty = preconditions.checkNotEmpty;

/**
 * The `GenericProvider` is responsible for retrieving secrets from Vault's generic secret backend.
 *
 * Because generic secrets are designed as persistent and un-renewable, the `GenericBackend`'s `renew` method simply
 * re-reads the secret if its TTL has expired. This guarantees that the `GenericBackend` won't continually perform
 * tasks that are not required by Vault and will instead update itself only when the validity of the secret expires.
 */
class GenericProvider {
  /**
   * Create a new instance of the `GenericProvider`.
   *
   * @param {string} path
   * @param {string} token
   */
  constructor(path, token) {
    checkNotEmpty(path, 'path is required');
    checkNotEmpty(token, 'token is required');

    this.path = path;
    this.token = token;

    this._client = new Vault({
      endpoint: `${(Config.get('vault:tls')) ? 'https' : 'http'}://${Config.get('vault:host')}:${Config.get('vault:port')}`,
      token
    });
    this.data = null;
  }

  /**
   * Retrieve the secret.
   * @returns {Promise}
   */
  initialize() {
    if (this.data) {
      return Promise.resolve(this.data);
    }

    return this._retrieve();
  }

  /**
   * Retrieve the requested secret from Vault
   * @returns {Promise}
   * @private
   */
  _retrieve() {
    this._client.token = this.token;

    return this._client.read(this.path)
      .then((response) => {
        this.data = response;

        return response;
      });
  }

  /**
   * Renew the secret.
   *
   * The method is effectively the same as initializing the secret.
   *
   * @returns {Promise}
   */
  renew() {
    return this._retrieve();
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

module.exports = GenericProvider;
