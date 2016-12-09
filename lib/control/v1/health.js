'use strict';

const started = Date.now();
const VERSION = require('../../../package').version;
const STATUS = require('../../utils/status');
const STATUS_CODES = require('../util/status-codes');

/**
 * Route handler for App health
 * @param {StorageService} storage
 * @returns {function}
 */
function Health(storage) {
  return (req, res) => {
    const status = {
      uptime: Date.now() - started,
      version: VERSION
    };

    storage.defaultToken.initialize().then((manager) => {
      if (manager.status !== STATUS.READY) {
        const err = new Error('Manager is not ready.');

        err.code = 'MANAGERNOTREADY';
        throw err;
      }

      if (!manager.data.token) {
        const err = new Error('No token data.');

        err.code = 'NOTOKENDATA';
        throw err;
      }

      res.status(STATUS_CODES.OK).json(Object.assign(status, {
        code: STATUS_CODES.OK,
        status: 'OK'
      }));
    }).catch((err) => {
      if (!err.code) {
        err.code = STATUS_CODES.SERVICE_UNAVAILABLE;
      }
      res.status(STATUS_CODES.SERVICE_UNAVAILABLE).json((Object.assign(status, {
        code: err.code,
        status: err.message
      })));
    });
  };
}

module.exports = Health;
