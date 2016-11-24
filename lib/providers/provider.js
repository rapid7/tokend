'use strict';

const ImplementationError = require('../errors').ImplementationError;

/**
 * Interface-like class for Providers to implement
 */
class Provider {
  /**
   * Constructor
   */
  constructor() {
    if (this === Provider) {
      throw new TypeError('Provider is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Provider#initialize
   */
  initialize() {
    throw new ImplementationError(`${this._getImplementation()} must implement the initialize() method`);
  }

  /**
   * Provider#renew
   */
  renew() {
    throw new ImplementationError(`${this._getImplementation()} must implement the renew() method`);
  }

  /**
   * Provider#invalidate
   */
  invalidate() {
    throw new ImplementationError(`${this._getImplementation()} must implement the invalidate() method`);
  }

  _getImplementation() {
    return this.constructor.name;
  }
}

module.exports = Provider;
