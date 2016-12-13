'use strict';

const Winston = require('winston');
const expressWinston = require('express-winston');

/**
 * Create a logger instance
 * @param {string} level
 * @returns {Winston.Logger}
 * @constructor
 */
function Logger(level) {
  const logLevel = level.toUpperCase() || 'INFO';

  const javaLogLevels = {
    levels: {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      VERBOSE: 3,
      DEBUG: 4,
      SILLY: 5
    }
  };

  const logger = new Winston.Logger({
    level: logLevel,
    levels: javaLogLevels.levels,
    transports: [
      new Winston.transports.Console({
        timestamp: true,
        json: Config.get('log:json'),
        stringify: Config.get('log:json')
      })
    ]
  });

  return logger;
}

/**
 * Generates middleware for Express to log incoming requests
 * @param {Winston.Logger} logger
 * @param {string} level
 * @returns {expressWinston.logger}
 * @constructor
 */
function RequestLogger(logger, level) {
  const logLevel = level.toUpperCase() || 'INFO';

  return expressWinston.logger({
    winstonInstance: logger,
    expressFormat: false,
    msg: '{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
    level: logLevel,
    baseMeta: {sourceName: 'request'},
    meta: true,
    dynamicMeta: (req, res) => {
      if (res.correlationId) {
        return {
          correlationId: res.correlationId
        };
      }

      return {};
    }
  });
}

exports.attach = Logger;
exports.requests = RequestLogger;
