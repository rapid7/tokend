'use strict';

/**
 * Error type for unimplemented methods
 */
class ImplementationError extends Error {
  /**
   * Constructor
   * @param {string} message
   */
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
  }
}

module.exports = {
  ImplementationError
};
