'use strict';

const GenericProvider = require('./generic');

/**
 * Cubbyhole implementation of the Generic provider
 */
class CubbyHoleProvider extends GenericProvider {
    /**
   * Create a new instance of the `CubbyHoleProvider`.
   *
   * @param {string} path
   * @param {string} token
   */
  constructor(path, token) {
    super(`cubbyhole/${path}`, token);
  }
}

module.exports = CubbyHoleProvider;
