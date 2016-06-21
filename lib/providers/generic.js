/* global Config */
'use strict';

const Vaulted = require('vaulted');
const preconditions = require('conditional');
const checkNotEmpty = preconditions.checkNotEmpty;

// Default Vault connection options
const VAULT_CONFIG = {
  vault_host: Config.get('vault:host'),
  vault_port: Config.get('vault:port'),
  vault_ssl: Config.get('vault:tls')
};

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

    this._client = new Vaulted(VAULT_CONFIG);
    this._value = null;
  }

  /**
   * Retrieve the generic secret.
   *
   * The callback has the following signature: `callback(err, data)`.
   *
   * @param {function} callback
   */
  initialize(callback) {
    if (this._value) {
      callback(new Error('Already initialized'), null);
      return;
    }

    this._client.prepare(this.token).then(() => this._retrieve(callback));
  }

  _retrieve(callback) {
    return this._client.read({id: this.path, token: this.token})
      .then(this._read.bind(this, callback))
      .catch((err) => callback(err, null));
  }

  /**
   * Renew the generic secret.
   *
   * The method name is effectively the same as initializing the secret.
   *
   * The callback has the following signature: `callback(err, data)`.
   *
   * @param {function} callback
   */
  renew(callback) {
    this._retrieve(callback);
  }

  /**
   * Processes a `Vaulted.read/readCubby` response.
   *
   * @param {function} callback
   * @param {object} response
   * @private
   */
  _read(callback, response) {
    this._value = response;

    callback(null, response);
  }
}

module.exports = GenericProvider;
