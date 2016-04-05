'use strict';

/**
 * The LeaseManager maintains state about a token or secret. It leverages a
 * SecretProvider object to handle interaction with Vault.
 */
class LeaseManager {
  /**
   * Create a new instance of a LeaseManager with the given SecretProvider
   * @param {SecretProvider} provider
   */
  constructor(provider) {
    this.status = 'PENDING';
    this.data = null;
    this.provider = provider;
  }

  /**
   * Initialize the SecretProvider
   */
  initialize() {
    this.provider.initialize((error, result) => {
      this._onProviderInitialize(error, result);
    });
  }

  /**
   * Called when the SecretProvider finishes initializing
   * @param {Error} error
   * @param {Object} result
   * @private
   */
  _onProviderInitialize(error, result) {
    if (error) {
      this.status = 'PENDING';
      this.data = null;
      this.initialize();
    }
    else {
      this.status = 'READY';
      this.data = result;
    }
  }
};

module.exports = LeaseManager;
