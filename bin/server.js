#!/usr/bin/env node

/* global Config */
'use strict';

const path = require('path');
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
