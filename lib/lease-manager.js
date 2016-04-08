'use strict';

const EventEmitter = require('events').EventEmitter;

/**
 * The LeaseManager maintains state about a token or secret. It leverages a
 * SecretProvider object to handle interaction with Vault.
 */
class LeaseManager extends EventEmitter {
  /**
   * Create a new instance of a LeaseManager with the given SecretProvider
   * @param {SecretProvider} provider
   */
  constructor(provider) {
    super();

    this.status = 'PENDING';
    this.data = null;
    this.lease_duration = 0;
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
   * Renew the lease from the SecretProvider
   * @private
   */
  _renew() {
    // We want to renew the lease TTL/2 seconds from now
    // (TTL / 2) * 1000 === TTL * 500
    const timeout = this.lease_duration * 500; // eslint-disable-line rapid7/static-magic-numbers

    setTimeout(() => {
      this.provider.renew((error, result) => {
        this._onProviderRenew(error, result);
      });
    }, timeout);
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
      this.lease_duration = 0;
      this.initialize();
    }
    else {
      this.status = 'READY';
      this.data = result.data;
      this.lease_duration = result.lease_duration;
      this.emit('ready');
      this._renew();
    }
  }

  /**
   * Called when the SecretProvider finishes renewing the lease
   * @param {Error} error
   * @param {Object} result
   * @private
   */
  _onProviderRenew(error, result) {
    if (error) {
      this.status = 'PENDING';
      this.lease_duration = 0;
      this.initialize();
    }
    else {
      this.lease_duration = result.lease_duration;
      this.emit('renewed');
      this._renew();
    }
  }
};

module.exports = LeaseManager;
