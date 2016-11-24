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
    if (Object.getPrototypeOf(this) === Provider.prototype) {
      throw new TypeError('Provider is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Provider#initialize
   */
  initialize() {
    throw new ImplementationError(`${this.constructor.name} must implement the initialize() method`);
  }

  /**
   * Provider#renew
   */
  renew() {
    throw new ImplementationError(`${this.constructor.name} must implement the renew() method`);
  }

  /**
   * Provider#invalidate
   */
  invalidate() {
    throw new ImplementationError(`${this.constructor.name} must implement the invalidate() method`);
  }
}

module.exports = Provider;
