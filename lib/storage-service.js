'use strict';

const TokenProvider = require('./providers/token');
const LeaseManager = require('./lease-manager');
const onceWithTimeout = require('./utils/once-with-timeout');

// Default LeaseManager timeout
const DEFAULT_TIMEOUT_MILLIS = 500;

// LeaseManager status
const STATUS = require('./utils/status');

class StorageService {

  /**
   * Create a new instance of a StorageService.
   *
   * @param {object} [options] - configuration options
   * @param {number} [options.timeout] - the timeout value (in millis) when looking up secrets
   *
   */
  constructor(options) {
    options = options || {};
    this.timeout = options.timeout || DEFAULT_TIMEOUT_MILLIS;

    this._managers = new Map();

  }

  get defaultToken() {
    const tokenManagerID = '/TokenProvider/default/default';

    if (!!this._defaultToken) {
      return this._managers.get(tokenManagerID);
    } else {
      this._defaultToken = this._createManager('default', 'default', TokenProvider, tokenManagerID);
      return this._defaultToken;
    }
  }

  set defaultToken(t) {
    this._defaultToken = t;
  }

  /**
   * Gets the data for the SecretProvider corresponding to the given secret, and returning a
   * Promise. If the underlying LeaseManager is not READY within the configured timeout period,
   * the lookup call will timeout and the method will return a rejected Promise with a timeout
   * error.
   *
   * @param {string} token - the token to use to lookup the secret (currently a no-op)
   * @param {string} secret - the secret to lookup
   * @param {TokenProvider|CubbyHoleProvider|SecretProvider|CredentialProvider} ProviderType - the type of provider
   * to instantiate
   * @returns {Promise}
   */
  lookup(token, secret, ProviderType) {
    return new Promise((resolve, reject) => {
      this._getLeaseManager(token, secret, ProviderType).then((manager) => {
        if (manager.status === STATUS.READY) {

          // LeaseManager is ready, immediately resolve with data
          resolve(manager.data);
        } else {

          // Queue the promise states with a timeout
          onceWithTimeout(manager, 'ready', this.timeout)
              .then(() => resolve(manager.data))
              .catch((err) => reject(err));
        }
      });
    });
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
      return this._managers.get(secretID).initialize();
    }

    return this.defaultToken.initialize().then(() => {
      const manager = this._createManager(this.defaultToken.data.token, secret, ProviderType, secretID);

      manager.initialize();
      return manager;
    });
  }

  _createManager(token, secret, ProviderType, secretID) {
    // TODO: get provider configuration (options) using secret
    const options = {};
    const provider = new ProviderType(secret, token, options);
    const manager = new LeaseManager(provider);

    StorageService.setEvents(manager);

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
