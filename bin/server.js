#!/usr/bin/env node

/* global Config, Log */
'use strict';

const args = require('yargs')
  .usage('Usage: $0 [args]')
  .option('c', {
    alias: 'config',
    describe: 'Load configuration from file',
    type: 'string'
  })
  .help('help')
  .argv;

const express = require('express');
const HTTP = require('http');
const Path = require('path');
const Logger = require('../lib/logger');

const app = express();
const server = HTTP.createServer(app);

// Load nconf into the global namespace
global.Config = require('nconf').env()
  .argv({
    config: {
      alias: 'c',
      default: '/etc/tokend/config.json',
      describe: 'Path to local tokend configuration'
    }
  });

if (args.c) {
  Config.file(Path.resolve(process.cwd(), args.c));
}
Config.defaults(require('../config/defaults.json'));

global.Log = Logger.attach(Config.get('log:level'));

// Add request logging middleware
app.use(Logger.requests(Log, Config.get('log:level')));

const StorageService = require('../lib/storage-service');

const storage = new StorageService();

require('../lib/control/v1').attach(app, storage);

// Instantiate server and start it
const host = Config.get('service:host');
const port = Config.get('service:port');

server.on('error', (err) => {
  Log.log('ERROR', err);
});

server.listen(port, host, () => {
  Log.log('INFO', `Listening on ${host}:${port}`);
});

