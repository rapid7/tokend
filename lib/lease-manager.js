'use strict';

const EventEmitter = require('events').EventEmitter;
const STATUS = require('./utils/status');

/**
 * The LeaseManager maintains state about a token or secret. It leverages a
 * SecretProvider object to handle interaction with Vault.
 */
class LeaseManager extends EventEmitter {
  /**
   * Create a new instance of a LeaseManager with the given SecretProvider
   * @param {TokenProvider|GenericProvider} provider
   */
  constructor(provider) {
    super();

    this.status = STATUS.PENDING;
    this.data = null;
    this.lease_duration = 0;
    this.provider = provider;
    this.error = null;
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
    const timeout = (this.lease_duration / 2) * 1000; // eslint-disable-line rapid7/static-magic-numbers

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
      this.status = STATUS.PENDING;
      this.data = null;
      this.lease_duration = 0;
      if (this.listeners('error').length > 0) {
        this.emit('error', error);
      }
      this.error = error;
      this.initialize();
    }
    else {
      this.status = STATUS.READY;
      this.data = result.data;
      this.lease_duration = result.lease_duration;
      this.emit('ready');
      this.error = null;
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
      this.status = STATUS.PENDING;
      this.lease_duration = 0;
      this.initialize();
    }
    else {
      this.lease_duration = result.lease_duration;
      this.data = result.data;
      this.emit('renewed');
      this._renew();
    }
  }
};

module.exports = LeaseManager;
