'use strict';

const TokenProvider = require('./providers/token');
const LeaseManager = require('./lease-manager');
const onceWithTimeout = require('./utils/once-with-timeout');

// Default LeaseManager timeout
const DEFAULT_TIMEOUT_MILLIS = 500;

// LeaseManager status
const STATUS = require('./utils/status');

/**
 * Maintains instances of `LeaseManager` and allows endpoint handlers to look up secrets
 */
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

  /**
   * Getter for the default token
   */
  get defaultToken() {
    const tokenManagerID = '/TokenProvider/default/default';

    if (!!this._defaultToken) {
      return this._managers.get(tokenManagerID);
    }

    this._defaultToken = this._createManager('default', 'default', TokenProvider, tokenManagerID);

    return this._defaultToken;
  }

  /**
   * Setter for the default token
   * @param {LeaseManager} t
   */
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
    return this._getLeaseManager(token, secret, ProviderType).then((manager) => {
      if (manager.status === STATUS.READY) {
        // LeaseManager is ready, immediately resolve with data
        return manager.data;
      }

      // Queue the promise states with a timeout
      return onceWithTimeout(manager, 'ready', this.timeout)
        .then(() => manager.data)
        .catch((err) => {
          this._managers.delete(manager.name);
          throw err;
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
   * @returns {Promise<LeaseManager>}
   *
   */
  _getLeaseManager(token, secret, ProviderType) {
    const secretID = `/${ProviderType.prototype.constructor.name}/${token}/${secret}`;

    return this.defaultToken.initialize().then(() => {
      // If the LeaseManager is already provisioned, return it
      if (this._managers.has(secretID)) {
        return this._managers.get(secretID).initialize();
      }

      const manager = this._createManager(this.defaultToken.data.token, secret, ProviderType, secretID);

      manager.initialize();

      return manager;
    });
  }

  /**
   * Creates a `LeaseManager` with the given configuration options
   * @param {string} token - the token to use to lookup the secret (currently a no-op)
   * @param {string} secret - the secret to get (or provision) a LeaseManager for
   * @param {TokenProvider|CubbyHoleProvider|SecretProvider|CredentialProvider|TransitProvider} ProviderType - the
   * type of provider to instantiate.
   * @param {string} secretID - the identifier to use to retrieve the `LeaseManager` from the
   * StorageService#_managers Map.
   *
   * @returns {LeaseManager}
   */
  _createManager(token, secret, ProviderType, secretID) {
    // TODO: get provider configuration (options) using secret
    const options = {};
    const provider = new ProviderType(secret, token, options);
    const manager = new LeaseManager(provider, secretID);

    StorageService.setEvents(manager);

    // Don't cache providers that can't be renewed
    if (manager.renewable) {
      this._managers.set(secretID, manager);
    }

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
        lease_duration: manager.lease_duration
      });
    });

    manager.on('renewed', () => {
      Log.log('INFO', 'Manager renewed provider\'s data', {
        provider: type,
        status: manager.status,
        lease_duration: manager.lease_duration
      });
    });

    manager.on('error', (err) => {
      Log.log('ERROR', err, {
        provider: type,
        status: manager.status,
        lease_duration: manager.lease_duration
      });
    });

    manager.on('invalidate', () => {
      Log.log('INFO', 'Invalidating token due to expiration.', {
        provider: type,
        status: manager.status,
        lease_duration: manager.lease_duration
      });
    });
  }
}

module.exports = StorageService;
