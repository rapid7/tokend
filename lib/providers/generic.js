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

class GenericProvider {
  /**
   * Constructor
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
  }

  /**
   * Get the secret at the path specified in the constructor
   * @param {function} callback
   */
  initialize(callback) {
    if (this._value) {
      callback(new Error('Already initialized'), null);
      return;
    }

    this._client.prepare(this.token)
      .then(this._client.read.bind(this._client, {id: this.path, token: this.token}, null))
      .then(this._read.bind(this, callback))
      .catch((err) => callback(err, null));
  }

  /**
   * Renew the secret at the path specified in the constructor
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
   * Process a Vaulted.read response
   * @param {function} callback
   * @param {object} response
   * @private
   */
  _read(callback, response) {
    // lease_duration is returned in seconds
    this._ttl = (response.lease_duration * 1000);
    this._retrieved = Date.now();
    this._value = response.data;

    callback(null, response.data);
  }

  /**
   * Test if the enough time has passed to satisfy the non-expiring ttl which may indicate new data
   * @returns {boolean}
   * @private
   */
  _canReRead() {
    return Date.now() >= (this._retrieved + this._ttl);
  }
}

module.exports = GenericProvider;
