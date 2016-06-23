'use strict';

const path = require('path');
const winston = require('winston');

global.Config = require('nconf')
  .argv()
  .env()
  .defaults(require('../config/defaults.json'));

global.Log = require('../lib/logger').attach('info');
Log.remove(winston.transports.Console);
