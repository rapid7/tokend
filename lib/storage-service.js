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
    let manager = null;

    return this._getLeaseManager(token, secret, ProviderType).then((m) => {
      manager = m;
      const correlationData = {
        correlation_id: manager.correlation_id
      };

      if (manager.status === STATUS.READY) {
        StorageService.logManagerEvent('INFO', 'Manager was able to lookup a secret.', manager);

        // LeaseManager is ready, immediately resolve with data
        return Object.assign(correlationData, manager.data);
      }

      // Queue the promise states with a timeout
      return onceWithTimeout(manager, 'ready', this.timeout).then(() => {
        StorageService.logManagerEvent('INFO', 'Manager was able to lookup a secret.', manager);

        return Object.assign(correlationData, manager.data);
      })
      .catch((err) => {
        StorageService.logManagerEvent('ERROR', err, manager);
        if (manager) {
          this._managers.delete(manager.name);
        }
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
        const manager = this._managers.get(secretID);

        StorageService.logManagerEvent('DEBUG', 'Retrieved LeaseManager.', manager);

        return manager.initialize();
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
    StorageService.logManagerEvent('INFO', 'Created LeaseManager.', manager);

    // Don't cache providers that can't be renewed
    if (manager.renewable) {
      this._managers.set(secretID, manager);
    }

    return manager;
  }

  /**
   * Consistently log events from LeaseManagers
   *
   * @param {String} level
   * @param {String} message
   * @param {LeaseManager} manager
   */
  static logManagerEvent(level, message, manager) {
    const type = manager.provider.constructor.name;
    const meta = {
      provider: type,
      status: manager.status,
      lease_duration: manager.lease_duration,
      correlation_id: manager.correlation_id
    };

    Log.log(level, message, meta);
  }

  /**
   * Set basic events on a LeaseManager
   * @param {LeaseManager} manager
   */
  static setEvents(manager) {
    manager.on('ready', () => {
      StorageService.logManagerEvent('INFO', 'Manager is ready.', manager);
    });

    manager.on('renewed', () => {
      StorageService.logManagerEvent('INFO', 'Manager renewed provider\'s data.', manager);
    });

    manager.on('error', (err) => {
      StorageService.logManagerEvent('ERROR', err, manager);
    });

    manager.on('invalidate', () => {
      StorageService.logManagerEvent('INFO', 'Invalidating manager due to expiration.', manager);
    });
  }
}

module.exports = StorageService;
