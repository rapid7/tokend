#!/usr/bin/env node

/* global Config */
'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const args = require('yargs')
  .usage('Usage: $0 [args]')
  .option('c', {
    alias: 'config',
    describe: 'Load configuration from file',
    type: 'string'
  })
  .help('help')
  .argv;

global.Config = require('nconf')
  .env()
  .argv();

if (args.c) {
  global.Config.file(path.resolve(process.cwd(), args.c));
}
global.Config.defaults(require('../config/defaults.json'));

const StorageService = require('../lib/storage-service');
const app = express();

require('../lib/control/v1').attach(app, new StorageService());

// Instantiate server and start it
const host = Config.get('service:host');
const port = Config.get('service:port');
const server = http.createServer(app);

server.on('error', (err) => console.error(err));

server.listen(port, host, () => {
  console.log(`Listening on ${host}:${port}`);
});
