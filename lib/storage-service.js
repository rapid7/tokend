'use strict';

const TokenProvider = require('./providers/token');
const LeaseManager = require('./lease-manager');
const onceWithTimeout = require('./utils/once-with-timeout');

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
    this.defaultToken = this._getLeaseManager('default', 'default', TokenProvider);
  }

  /**
   * Gets the data for the SecretProvider corresponding to the given secret, passing it to the given
   * callback. If the underlying LeaseManager is not READY within the configured timeout period,
   * the lookup call will timeout and the given callback will passed a timeout error.
   *
   * @param {string} token - the token to use to lookup the secret (currently a no-op)
   * @param {string} secret - the secret to lookup
   * @param {TokenProvider|CubbyHoleProvider|SecretProvider|CredentialProvider} ProviderType - the type of provider
   * to instantiate
   * @param {Function} callback - function of the form callback(err, data)
   *
   */
  lookup(token, secret, ProviderType, callback) {
    const manager = this._getLeaseManager(token, secret, ProviderType);

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
   * @param {string} token - the token to use to lookup the secret (currently a no-op)
   * @param {string} secret - the secret to get (or provision) a LeaseManager for
   * @param {TokenProvider|CubbyHoleProvider|SecretProvider|CredentialProvider} ProviderType - the type of provider
   * to instantiate
   *
   * @returns {LeaseManager}
   *
   */
  _getLeaseManager(token, secret, ProviderType) {
    const secretID = `/${ProviderType.prototype.constructor.name}/${token}/${secret}`;

    // If the LeaseManager is already provisioned, return it
    if (this._managers.has(secretID)) {
      return this._managers.get(secretID);
    }

    let t = '';

    if (!!this.defaultToken && this.defaultToken.status === STATUS.READY) {
      t = this.defaultToken.data.token;
    }

    // Otherwise, provision a new LeaseManager for the secret
    // TODO: get provider configuration (options) using secret
    const options = {};
    const provider = new ProviderType(secret, t, options);
    const manager = new LeaseManager(provider);

    StorageService.setEvents(manager);

    // Initialize the LeaseManager
    manager.initialize();

    this._managers.set(secretID, manager);

    return manager;
  }

  /**
   * Set basic events on a LeaseManager
   * @param {LeaseManager} manager
   */
  static setEvents(manager) {
    const type = manager.provider.constructor.name;

    manager.on('ready', () => {
      Log.log('INFO', 'Manager is ready', {
        provider: type,
        status: manager.status,
        data: manager.data,
        lease_duration: manager.lease_duration
      });
    });

    manager.on('renewed', () => {
      Log.log('INFO', 'Manager renewed provider\'s data', {
        provider: type,
        status: manager.status,
        data: manager.data,
        lease_duration: manager.lease_duration
      });
    });

    manager.on('error', (err) => {
      Log.log('ERROR', err);
    });
  }
}

module.exports = StorageService;
