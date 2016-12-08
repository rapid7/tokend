'use strict';

const request = require('supertest');
const STATUS_CODES = require('../../lib/control/util/status-codes');

class HttpTestUtils {
  /**
   * Constructor
   * @param {express} server
   */
  constructor(server) {
    this.server = server;
  }

  /**
   * Accepts a request
   * @param {String} endpoint - Endpoint to request
   * @param {String} method - Request method
   * @param {Object} body - Request body
   * @param {Object} headers - Request headers
   * @return {Test}
   */
  acceptRequest(endpoint, method, body, headers) {
    return this.request(endpoint, method, STATUS_CODES.OK, body, headers);
  }

  /**
   * Reject any other request type
   * @param {String} endpoint - Endpoint to request
   * @param {Array} methods - Methods to test
   * @param {Object} body - Request body
   * @param {Object} headers - Request headers
   * @param {String} allowedMethod - Allowed request method
   * @returns {Promise}
   */
  rejectOtherRequests(endpoint, methods, body, headers, allowedMethod) {
    const promises = methods.map((type) => { // eslint-disable-line arrow-body-style
      return new Promise((resolve, reject) => {
        this.request(endpoint, type, STATUS_CODES.METHOD_NOT_ALLOWED, body, headers, allowedMethod).end((err, res) => {
          if (err) {
            return reject(err);
          }
          resolve(res);
        });
      });
    });

    return Promise.all(promises);
  }

  /**
   * Execute a callback against a supertest request
   * @param {String} endpoint
   * @param {String} method
   * @param {Number} expected
   * @param {Object} body
   * @param {Object} headers
   * @param {function} callback
   * @returns {Test}
   */
  testEndpointResponse(endpoint, method, expected, body, headers, callback) {
    return this.request(endpoint, method, expected, body, headers).end(callback);
  }

  /**
   * Create the supertest Test
   * @param {string} endpoint
   * @param {string} method
   * @param {number} code
   * @param {object} [body]
   * @param {object} [headers]
   * @param {string} [allowedType]
   * @returns {Test}
   */
  request(endpoint, method, code, body, headers, allowedType) {
    let r = request(this.server);

    headers = headers || {};
    body = body || {};
    allowedType = allowedType || 'GET';

    switch (method) {
    case 'GET':
      r = r.get(endpoint);
      break;
    case 'POST':
      r = r.post(endpoint).send(body);
      break;
    case 'DELETE':
      r = r.del(endpoint);
      break;
    case 'PUT':
      r = r.put(endpoint);
      break;
    case 'HEAD':
      r = r.head(endpoint);
      break;
    default:
      throw Error('invalid type supplied');
    }

    for (const h in headers) {
      r = r.set(h, headers[h]);
    }

    if (code === STATUS_CODES.METHOD_NOT_ALLOWED) {
      r = r.expect('Allow', allowedType);
    }

    if (code === STATUS_CODES.OK || code === STATUS_CODES.BAD_REQUEST) {
      r = r.expect('Content-Type', 'application/json; charset=utf-8');
    }

    return r
      .set('Accept', 'application/json')
      .expect(code);
  }
}

module.exports = HttpTestUtils;
