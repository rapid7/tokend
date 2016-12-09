'use strict';

const UUID = require('node-libuuid');

/**
 * Create a correlation id
 * @return {String}
 */
exports.create = function create() {
  const id = UUID.v4();

  Log.log('INFO', `Created correlation id ${id}`);

  return id;
};
