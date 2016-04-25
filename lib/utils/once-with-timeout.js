'use strict';

const preconditions = require('conditional');
const checkNotNull = preconditions.checkNotNull;
const checkArgument = preconditions.checkArgument;

const EventEmitter = require('events').EventEmitter;

const DEFAULT_TIMEOUT_MILLIS = 500;

/**
 * Utility function to timeout an event handler after a specified amount of time.
 *
 * @param {EventEmitter} emitter - The EventEmitter to listen for events from.
 * @param {string} eventName - The event to listen for.
 * @param {number} [timeout] - The timeout period in millis if a positive number, otherwise no timeout.
 *
 * @returns {Promise}
 *
 */
module.exports = function onceWithTimeout(emitter, eventName, timeout) {

  checkNotNull(emitter, 'emitter is required');
  checkNotNull(eventName, 'eventName is required');

  checkArgument(emitter instanceof EventEmitter, 'emitter must be an instance of EventEmitter');

  return new Promise((resolve, reject) => {

    let timer;

    const handler = function() {
      clearTimeout(timer);
      resolve(arguments);
    }

    // If a timeout is specified, register a timer to timeout the event handler
    if (!isNaN(timeout) && timeout > 0 && timeout < Infinity) {
      timer = setTimeout(() => {
        emitter.removeListener(eventName, handler);
        reject(new Error(`timeout: '${eventName}' event`));
      }, timeout);
    }

    emitter.once(eventName, handler);
  });
}
