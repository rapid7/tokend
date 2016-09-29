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
   * @param {String} key -
   */
  constructor(key) {
    checkNotEmpty(key, 'key is required');
  }
}

module.exports = TransitProvider;
