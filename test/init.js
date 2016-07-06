'use strict';

const path = require('path');

global.Log = {
  log() {}
};

global.Config = require('nconf')
  .argv()
  .env()
  .defaults(require('../config/defaults.json'));
