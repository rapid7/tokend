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
   * Accept GET requests
   * @param {string} endpoint
   * @returns {Test}
   */
  acceptGETRequest(endpoint) {
    return this.request(endpoint, 'GET', STATUS_CODES.OK);
  }

  /**
   * Accept POST requests
   * @param {String} endpoint
   * @param {Object} body
   * @returns {Test}
   */
  acceptPOSTRequest(endpoint, body) {
    return this.request(endpoint, 'POST', STATUS_CODES.OK, body);
  }

  /**
   * Reject any other request type
   * @param {string} endpoint
   * @returns {Test}
   */
  rejectOtherRequests(endpoint) {
    this.request(endpoint, 'POST', STATUS_CODES.METHOD_NOT_ALLOWED);
    this.request(endpoint, 'PUT', STATUS_CODES.METHOD_NOT_ALLOWED);
    return this.request(endpoint, 'DELETE', STATUS_CODES.METHOD_NOT_ALLOWED);
  }

  /**
   * Test that all non-POST requests are rejected
   * @param {String} endpoint - Endpoint for the request
   * @param {Object} body - Body to send with the request
   * @returns {Promise}
   */
  rejectNonPOSTRequests(endpoint, body) {
    const promises = ['GET', 'PUT', 'DELETE'].map((type) => {
      return new Promise((resolve, reject) => {
        this.request(endpoint, type, STATUS_CODES.METHOD_NOT_ALLOWED, body, 'POST').end((err, res) => {
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
   * @param {string} endpoint
   * @param {function} callback
   * @returns {Test}
   */
  testEndpointResponse(endpoint, callback) {
    return this.request(endpoint, 'GET', STATUS_CODES.OK).end(callback);
  }

  /**
   * Execute a callback against a supertest POST request
   * @param {String} endpoint - The endpoint to request
   * @param {String} body - The body to POST
   * @param {Function} callback - called with (err, res) when the request completes
   * @returns {Test}
   */
  testEndpointPOSTResponse(endpoint, body, callback) {
    return this.request(endpoint, 'POST', STATUS_CODES.OK, body).end(callback);
  }

  /**
   * Create the supertest Test
   * @param {string} endpoint
   * @param {string} type
   * @param {number} code
   * @param {object} [body]
   * @param {string} [allowedType]
   * @returns {Test}
   */
  request(endpoint, type, code, body, allowedType) {
    let r = request(this.server);

    if (!allowedType) {
      allowedType = 'GET';
    }

    switch (type) {
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
        break;
    }

    r = (code === STATUS_CODES.OK) ? r.expect('Content-Type', 'application/json; charset=utf-8') : r;
    r = (code === STATUS_CODES.METHOD_NOT_ALLOWED) ? r.expect('Allow', allowedType) : r;

    return r
      .set('Accept', 'application/json')
      .expect(code)
  }
}

module.exports = HttpTestUtils;
