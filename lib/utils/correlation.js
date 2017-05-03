'use strict';

const UUID = require('uuid');

/**
 * Create a correlation id
 * @return {String}
 */
exports.create = function create() {
  return UUID.v4();
};
