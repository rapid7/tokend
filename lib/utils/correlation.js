'use strict';

const UUID = require('node-libuuid');

/**
 * Create a correlation id
 * @return {String}
 */
exports.create = function create() {
  return UUID.v4();
};
