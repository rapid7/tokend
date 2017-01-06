'use strict';

global.Log = {
  log() {}
};

const defaults = Object.assign(require('../config/defaults.json'), {
  vault: {
    host: '127.0.0.1',
    port: 8200,
    tls: true,
    token_renew_increment: 60
  },
  warden: {
    host: '127.0.0.1',
    port: 3000
  }
});

global.Config = require('nconf')
  .argv()
  .env()
  .defaults(defaults);
