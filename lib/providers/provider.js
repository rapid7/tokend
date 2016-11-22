'use strict';

/**
 * Error type for unimplemented methods
 */
class ImplementationError extends TypeError {
  /**
   * Constructor
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.message = message;
    this.type = this.constructor.name;
  }
}
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
