'use strict';

const TokenProvider = require('./providers/token');
const LeaseManager = require('./lease-manager');
const onceWithTimeout = require('./utils/once-with-timeout');

// Default token secret
const DEFAULT_SECRET = '/v1/token/default';

// Default LeaseManager timeout
const DEFAULT_TIMEOUT_MILLIS = 500;

// LeaseManager status
const STATUS = {
  READY: 'READY',
  PENDING: 'PENDING'
};

class StorageService {

  /**
   * Create a new instance of a StorageService.
   *
   * @param {object} [options] - configuration options
   * @param {string} [options.timeout] - the timeout value (in millis) when looking up secrets
   *
   */
  constructor(options) {
    options = options || {};
    this.timeout = options.timeout || DEFAULT_TIMEOUT_MILLIS;

    this._managers = new Map();
    this._getLeaseManager(DEFAULT_SECRET);
  }

  /**
   * Gets the data for the SecretProvider corresponding to the given secret, passing it to the given
   * callback. If the underlying LeaseManager is not READY within the configured timeout period,
   * the lookup call will timeout and the given callback will passed a timeout error.
   *
   * @param {string} secret - the secret to lookup
   * @param {Function} callback - function of the form callback(err, data)
   *
   */
  lookup(secret, callback) {
    const manager = this._getLeaseManager(secret);

    if (manager.status === STATUS.READY) {

      // LeaseManager is ready, immediately callback with data
      callback(null, manager.data);
    } else {

      // Queue the callback with a timeout
      onceWithTimeout(manager, 'ready', this.timeout)
        .then(() => callback(null, manager.data))
        .catch((err) => callback(err, null));
    }
  }

  /**
   * Gets a LeaseManager for the given secret, or provisions a new LeaseManager
   * if it is not already provisioned.
   *
   * @private
   * @param {String} secret - the secret to get (or provision) a LeaseManager for
   *
   * @returns {LeaseManager}
   *
   */
  _getLeaseManager(secret) {

    // If the LeaseManager is already provisioned, return it
    if(this._managers.has(secret)) {
      return this._managers.get(secret);
    }

    // Otherwise, provision a new LeaseManager for the secret
    // TODO: get provider configuration (options) using secret
    // TODO: determine provider type from secret
    const options = {};
    const provider = new TokenProvider(options);
    const manager = new LeaseManager(provider);

    // Initialize the LeaseManager
    manager.initialize();

    this._managers.set(secret, manager);

    return manager;
  }
}

module.exports = StorageService;
