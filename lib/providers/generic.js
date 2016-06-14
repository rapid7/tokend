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
    this._ttl = null;
    this._retrieved = null;
    this._value = null;

    this._method = null
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

    this._client.prepare(this.token)
      .then(this._client[this._method].bind(this._client, {id: this.path, token: this.token}, null))
      .then(this._read.bind(this, callback))
      .catch((err) => callback(err, null));
  }

  /**
   * Renew the generic secret.
   *
   * The method name is a misnomer in the sense that it does not actually renew the secret. Instead, it determines
   * whether the secret is still considered valid (measured by the TTL expiration) and attempts to retrieve the
   * secret again if so.
   *
   * The callback has the following signature: `callback(err, data)`.
   *
   * @param {function} callback
   */
  renew(callback) {
    if (!this._canReRead()) {
      callback(null, this._value);
      return;
    }

    this._client.read({id: this.path, token: this.token})
      .then(this._read.bind(this, callback))
      .catch((err) => {
        callback(err, null);
      });
  }

  /**
   * Processes a `Vaulted.read` response.
   *
   * @param {function} callback
   * @param {object} response
   * @private
   */
  _read(callback, response) {
    // lease_duration is returned in seconds
    this._ttl = (response.lease_duration * 1000);
    this._retrieved = Date.now();
    this._value = response;

    callback(null, response);
  }

  /**
   * Determines whether the secret has become invalid due to its TTL expiring.
   *
   * Returns `true` if the secret's TTL has expired.
   *
   * @returns {boolean}
   * @private
   */
  _canReRead() {
    return Date.now() >= (this._retrieved + this._ttl);
  }
}

module.exports = GenericProvider;
