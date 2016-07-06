/* global Config */
'use strict';

const GenericProvider = require('./generic');

class CubbyHoleProvider extends GenericProvider {
  constructor(path, token) {
    super(path, token);
    this._method = 'readCubby';
  }
}

module.exports = CubbyHoleProvider;
