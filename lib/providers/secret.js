/* global Config */
'use strict';

const GenericProvider = require('./generic');

class SecretProvider extends GenericProvider {
  constructor(path, token) {
    super(path, token);
    this._method = 'read';
  }
}

module.exports = SecretProvider;
