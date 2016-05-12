'use strict';

const path = require('path');

global.Config = require('nconf')
  .argv()
  .env()
  .defaults(require('../config/defaults.json'));
