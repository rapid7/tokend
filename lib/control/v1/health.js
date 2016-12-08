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
        throw new Error('Manager is not ready.');
      }

      if (!manager.data.token) {
        throw new Error('No token data.');
      }

      res.status(STATUS_CODES.OK).json(Object.assign(status, {
        code: STATUS_CODES.OK,
        status: 'OK'
      }));
    }).catch((err) => {
      res.status(STATUS_CODES.SERVICE_UNAVAILABLE).json((Object.assign(status, {
        code: err.code,
        status: err.message
      })));
    });
  };
}

module.exports = Health;
