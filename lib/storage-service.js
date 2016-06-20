/* global Config */
'use strict';

const TokenProvider = require('./providers/token');
const SecretProvider = require('./providers/secret');
const CubbyHoleProvider = require('./providers/cubbyhole');
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
   * @param {number} [options.timeout] - the timeout value (in millis) when looking up secrets
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

    let token, provider;

    // If the token LeaseManager has not been provisioned, create it
    if(!this._managers.has(DEFAULT_SECRET)) {
      const manager = new LeaseManager(new TokenProvider());

      StorageService.setEvents(manager);
      manager.initialize();
      this._managers.set(secret, manager);
      return manager;
    } else {
      const manager = this._managers.get(DEFAULT_SECRET);

      if (manager.status === STATUS.READY) {
        token = manager.data.token;
      } else {
        return manager;
      }
    }

    // Otherwise, determine which provider to use  and provision a new LeaseManager for the secret
    const parsedSecret = secret.replace(/\/v\d\/secret\/default\//, '').split('/');
    const mount = parsedSecret.shift();
    const role = parsedSecret.join('/');

    switch (true) {
      case /^secret/.test(mount):
        provider = new SecretProvider(role, token);
        break;
      case /^cubbyhole/.test(mount):
        provider = new CubbyHoleProvider(role, token);
        break;
      case /default\/pki/.test(mount):
      case /^mysql/.test(mount):
      case /^cassandra/.test(mount):
      default:
        throw new Error('Unsupported secret backend');
    }

    const manager = new LeaseManager(provider);

    StorageService.setEvents(manager);

    // Initialize the LeaseManager
    manager.initialize();

    this._managers.set(secret, manager);

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
