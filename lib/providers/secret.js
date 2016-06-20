/* global Config */
'use strict';

const Generic = require('./generic');

class Secret extends Generic {
  constructor(path, token) {
    super(path, token);
    this._method = 'read';
  }
}

module.exports = Secret;
