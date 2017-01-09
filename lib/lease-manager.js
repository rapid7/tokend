'use strict';

const EventEmitter = require('events').EventEmitter;
const STATUS = require('./utils/status');
const Correlation = require('./utils/correlation');
const VAULT_TOKEN_RENEW_INCREMENT = Config.get('vault:token_renew_increment');

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
    this.correlation_id = Correlation.create();

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
      this._clearTimer();
      this.error = err;
    });

    this.on('invalidate', () => {
      this.status = STATUS.PENDING;
      this.data = null;
      this.lease_duration = 0;
      this.error = null;
      this._clearTimer();
      provider.invalidate();
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
   * Clears timing related settings
   * @private
   */
  _clearTimer() {
    clearTimeout(this._timer);
    delete this._timer;
    delete this._timeout;
  }

  /**
   * Calculates the timeout for the renewal loop
   * @return {number}
   * @private
   */
  _calculateTimeout() {
    const timeout = (this.lease_duration >= VAULT_TOKEN_RENEW_INCREMENT) ?
        VAULT_TOKEN_RENEW_INCREMENT :
        this.lease_duration;

    return Math.floor(timeout / 2) * 1000; // eslint-disable-line rapid7/static-magic-numbers
  }

  /**
   * Calculate whether a LeaseManager's Provider is approaching expiration
   * @param {number} elapsed
   * @return {boolean}
   * @private
   */
  _isExpiring(elapsed) {
    const token_ttl_expiration = this.provider.creation_time + elapsed + (VAULT_TOKEN_RENEW_INCREMENT * 1000);

    Log.log('DEBUG', {
      lease_duration: this.lease_duration,
      timeout: this._timeout,
      token_ttl_expiration: new Date(token_ttl_expiration),
      token_expiration: new Date(this.provider.expiration_time)
    });

    return new Date(token_ttl_expiration) >= new Date(this.provider.expiration_time);
  }

  /**
   * Renew the lease from the SecretProvider
   * @return {LeaseManager}
   * @private
   */
  _renew() {
    // Can't renew if the provider isn't renewable or we're not initialized
    if (!this.renewable || ([STATUS.ERROR, STATUS.PENDING].indexOf(this.status) !== -1)) {
      this._clearTimer();

      return this;
    }

    // Can't renew if _renew() has already been called
    if (this._timer) {
      return this;
    }

    this._timer = true;
    this._timeout = this._calculateTimeout();
    const start = Date.now();

    setImmediate(function renew() {
      this.provider.renew().then((result) => {
        const elapsed = Date.now() - start;

        this.emit('renewed', result);
        if (this._isExpiring(elapsed)) {
          this.emit('invalidate');
        } else {
          this._timeout = this._calculateTimeout();
          Log.log('DEBUG', {
            timeout: this._timeout
          });
          this._timer = setTimeout(renew.bind(this), this._timeout);
        }
      }).catch((err) => {
        this.emit('error', err);
      });
    }.bind(this));

    return this;
  }
}

module.exports = LeaseManager;
