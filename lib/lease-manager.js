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
   * @returns {Promise}
   */
  initialize() {
    return this.provider.initialize().then((result) => {
      this.status = STATUS.READY;
      this.data = result.data;
      this.lease_duration = result.lease_duration;
      this.emit('ready');
      this.error = null;
      this._renew();
      return Promise.resolve(this);
    }).catch((err) => {
      this.status = STATUS.PENDING;
      this.data = null;
      this.lease_duration = 0;
      if (this.listeners('error').length > 0) {
        this.emit('error', err);
      }
      this.error = err;

      // TODO: This isn't great. We need a combination of exponential backoff and having re-initialization on
      // correction of the error condition occur elsewhere.
      // return this.initialize();
      return Promise.reject(err);
    });
  }

  /**
   * Renew the lease from the SecretProvider
   * @private
   */
  _renew() {
    const timeout = (this.lease_duration / 2) * 1000; // eslint-disable-line rapid7/static-magic-numbers

    setTimeout(() => {
      this.provider.renew().then((result) => {
        this.lease_duration = result.lease_duration;
        this.data = result.data;
        this.emit('renewed');
        this._renew();
      }).catch((err) => {
        this.error = err;
        this.status = STATUS.PENDING;
        this.lease_duration = 0;
        this.initialize();
      });
    }, timeout);
  }
}

module.exports = LeaseManager;
