'use strict';


/* Regex explained:
2 capture groups with global and ignore case flags
1. Digits with an optional decimal - (\d*\.?\d+?)
2. Two characters, second optional - ([a-zµ][a-z]?). Since we match µ but only in the
   leading position, we only need to add it to the first character test
*/
const duration = /(\d*\.?\d+?)([a-zµ][a-z]?)/ig;
const parse = {};

parse.s = 1;
parse.ns = parse.s / 1e+9;
parse.µs = parse.us = parse.s / 1e+6;
parse.ms = parse.s / 1000;
parse.m = parse.s * 60;
parse.h = parse.m * 60;
parse.d = parse.h * 24;

/**
 * Convert a duration suffixed string to seconds
 *
 * Valid time units are "ns", "us" (or "µs"), "ms", "s", "m", "h", "d".
 *
 * @param {string} time The time string to parse
 * @returns {Number} The parsed time string as a number of seconds
 */
parse.parse = function(time) {
  // Null and undefined check
  if (time == null) { // eslint-disable-line eqeqeq
    return 0;
  }

  // Confirm we're working with strings
  let timeStr = time.toString();

  // Empty string check
  if (timeStr.length === 0) {
    return 0;
  }

  // Negative check
  if (timeStr.startsWith('-')) {
    // Negative values should return 0 for our purpose
    return 0;
  }

  // Check to see if we can parse the value as a number
  if (!isNaN(Number(timeStr))) {
    // If so, convert the value to a number and return it
    return Number(timeStr);
  }

  // Strip commas
  timeStr = timeStr.replace(/[,]+/g, '');

  let result = 0;

  timeStr.replace(duration, (match, num, units) => {
    const modifier = parse[units.toLowerCase()];

    // If the passed units are unknown, throw an error
    if (typeof modifier === 'undefined') {
      throw new Error(`Unknown unit ${units}`);
    }

    result += parseFloat(num) * modifier;
  });

  return Number(result);
};

module.exports = parse;
