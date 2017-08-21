'use strict';

const Vault = require('node-vault');
const preconditions = require('conditional');
const checkNotEmpty = preconditions.checkNotEmpty;

// Default Vault connection options
const DEFAULT_VAULT_TLS = Config.get('vault:tls');
const DEFAULT_VAULT_HOST = Config.get('vault:host');
const DEFAULT_VAULT_PORT = Config.get('vault:port');

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

    this._client = new Vault({
      endpoint: `${(DEFAULT_VAULT_TLS) ? 'https' : 'http'}://${DEFAULT_VAULT_HOST}:${DEFAULT_VAULT_PORT}`,
      token
    });
  }

  /**
   * Decrypt the ciphertext
   *
   * @return {Promise} - Resolves with decrypted ciphertext; rejects with an Error if decryption fails
   */
  initialize() {
    return this._decrypt();
  }

  /**
   * Decrypt the ciphertext using Vault's /transit/decrypt/ API
   *
   * @return {Promise} - Resolves with decrypted ciphertext; rejects with an Error if decryption fails
   * @private
   */
  _decrypt() {
    return this._client.request({
      path: `/transit/decrypt/${this._key}`,
      method: 'POST',
      json: this._parameters
    }).then((response) => {
      this._plaintext = response;

      return response;
    });
  }

    /**
   * Stub to conform to Provider interface
   */
  invalidate() {}

  /**
   * Does the provider require a Vault token
   */
  requireVaultToken() { }
}

module.exports = TransitProvider;
