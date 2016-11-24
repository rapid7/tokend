/* global Config */
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
    super(path, token);
    this._method = 'readCubby';
  }
}

module.exports = CubbyHoleProvider;
