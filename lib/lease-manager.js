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
   * @param {string} name
   */
  constructor(provider, name) {
    super();

    this.status = STATUS.PENDING;
    this.data = null;
    this.lease_duration = 0;
    this.provider = provider;
    this.name = name;
    this.error = null;

    this.on('renewed', (result) => {
      this.lease_duration = result.lease_duration;
      this.data = result.data;
      this.status = STATUS.READY;
    });

    this.on('ready', () => {
      this.status = STATUS.READY;
      this.error = null;
    });

    this.on('error', (err) => {
      if (this.status !== STATUS.READY) {
        this.data = null;
        this.lease_duration = 0;
      }

      this.status = STATUS.ERROR;

      // Clear timer so we can renew again
      clearInterval(this._timer);
      this._timer = null;

      this.error = err;
    });
  }

  /**
   * Flag to determine if the provider's renewable
   */
  get renewable() {
    return !!this.provider && typeof this.provider.renew === 'function';
  }

  /**
   * Initialize the SecretProvider
   *
   * @returns {Promise}
   */
  initialize() {
    return this.provider.initialize().then((result) => {
      this.data = result.data;
      this.lease_duration = result.lease_duration;

      if (this.status !== STATUS.READY) {
        this.emit('ready');
      }

      return this._renew();
    }).catch((err) => {
      this.emit('error', err);

      throw err;
    });
  }

  /**
   * Renew the lease from the SecretProvider
   * @return {LeaseManager}
   * @private
   */
  _renew() {
    if (!this.renewable) {
      clearInterval(this._timer);
      this._timer = null;
      this._timeout = null;
      return this;
    }

    const timeout = (this.lease_duration / 2) * 1000; // eslint-disable-line rapid7/static-magic-numbers

    if (this._timer && this._timeout === timeout) {
      return this;
    } else {
      clearInterval(this._timer);
      this._timeout = timeout;
    }

    this._timer = setInterval(() => {
      this.provider.renew().then((result) => {
        this.emit('renewed', result);
        this._renew();
      }).catch((err) => {
        this.emit('error', err);
        this.initialize();
      });
    }, this._timeout);

    return this;
  }
}

module.exports = LeaseManager;
