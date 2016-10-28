#!/usr/bin/env node

'use strict';

var path = require('path');
var argv = require('yargs')
  .usage('Usage: $0 --config file [options]')
  .demand('config')
  .describe({
    config: 'config file to read',
    test: 'test configuration and exit'
  })
  .alias('c', 'config')
  .alias('t', 'test')
  .boolean('test')
  .help('help', 'print this message and exit')
  .argv;

var build = require('../src');
var validate = require('../src/validate-config');
var log = require('../src/log');

function main() {
  var configFile = argv.config;

  var errors = validate(configFile);

  if (errors) {
    log.error(errors);
    process.exit(-1);
  }

  if (argv.test) {
    process.exit(0);
  }

  build(configFile);
}
main();
