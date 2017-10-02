#!/usr/bin/env node

'use strict';

const args = require('yargs')
  .usage('Usage: $0 [args]')
  .option('c', {
    alias: 'config',
    describe: 'Load configuration from file',
    default: '/etc/tokend/config.json',
    type: 'string'
  })
  .option('colorize', {
    describe: 'Colorize log output',
    type: 'boolean',
    default: false
  })
  .help('help')
  .argv;

const express = require('express');
const HTTP = require('http');
const Path = require('path');
const Logger = require('../lib/logger');
const BodyParser = require('body-parser');

const app = express();
const server = HTTP.createServer(app);

// Load nconf into the global namespace
global.Config = require('nconf').env()
  .argv();

if (args.c) {
  Config.file(Path.resolve(process.cwd(), args.c));
}
Config.defaults(require('../config/defaults.json'));

Config.required([
  'vault:host',
  'vault:port',
  'vault:token_renew_increment',
  'warden:host',
  'warden:port',
  'warden:path'
]);

global.Log = Logger.attach(Config.get('log:level'));

// Add request logging middleware
if (Config.get('log:requests')) {
  app.use(Logger.requests(Log, Config.get('log:level')));
}

// Retrieve the instance region and store it in the Config
const Metadata = require('../lib/utils/metadata');

// Check if a specific region has been set. Maybe someone
// will want to use a key from a different region?
if (!Config.get('kms:region')) {
  Metadata.region().then((region) => {
    Config.set('kms:region', region);
  }).catch((err) => {
    Log.log('ERROR', err);
    Log.log('INFO', "Setting kms region to 'us-east-1'.");
    Config.set('kms:region', 'us-east-1');
  });
}

// Add middleware for paring JSON requests
app.use(BodyParser.json());

const StorageService = require('../lib/storage-service');

const storage = new StorageService({
  timeout: Config.get('service:storage:timeout')
});

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
