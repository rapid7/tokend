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
 * The TransitProvider is responsible for retrieving secrets from Vault's transit secret backend.
 * https://www.vaultproject.io/docs/secrets/transit/index.html
 */
class TransitProvider {
  /**
   * Create a new instance of a TransitProvider.
   *
   * @param {Object} secret
   * @param {Object} secret.key - Key in Vault to use for decryption
   * @param {Object} secret.ciphertext - Ciphertext to decrypt
   * @param {String} token - Token to pass to Vault's API
   */
  constructor(secret, token) {
    checkNotEmpty(secret, 'secret is required');
    checkNotEmpty(secret.key, 'secret.key is required');
    checkNotEmpty(secret.ciphertext, 'secret.ciphertext is required');
    checkNotEmpty(token, 'token is required');

    this._key = secret.key;
    this._token = token;
    this._parameters = {
      ciphertext: secret.ciphertext
    };

    this._client = new Vaulted(VAULT_CONFIG);
    this._plaintext = null;
  }

  /**
   * Decrypt the ciphertext
   *
   * @return {Promise} - Resolves with decrypted ciphertext; rejects with an Error if decryption fails
   */
  initialize() {
    if (this._plaintext) {
      return Promise.resolve(this._plaintext);
    }
    return this._decrypt();
  }

  /**
   * Decrypt the ciphertext
   *
   * @return {Promise} - Resolves with decrypted ciphertext; rejects with an Error if decryption fails
   */
  renew() {
    return this._decrypt();
  }

  /**
   * Decrypt the ciphertext using Vault's /transit/decrypt/ API
   *
   * @return {Promise} - Resolves with decrypted ciphertext; rejects with an Error if decryption fails
   * @private
   */
  _decrypt() {
    return this._client.prepare(this._token)
      .then(this._client.decryptTransitCipherText.bind(this._client, {
        id: this._key,
        token: this._token,
        body: this._parameters
      }, null))
      .then((response) => {
        this._plaintext = response;
        return response;
      });
  }

  /**
   * Get a unique ID for the given token and secret
   *
   * @param {String} token
   * @param {Object} secret
   * @param {Object} secret.key
   * @param {Object} secret.ciphertext
   * @return {String}
   */
  static getSecretID(token, secret) {
    return `${token}/${secret.key}/${secret.ciphertext}`;
  }
}

module.exports = TransitProvider;
