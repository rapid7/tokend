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
   * Execute a callback against a supertest request
   * @param {string} endpoint
   * @param {function} callback
   * @returns {Test}
   */
  testEndpointResponse(endpoint, callback) {
    return this.request(endpoint, 'GET', STATUS_CODES.OK).end(callback);
  }

  /**
   * Create the supertest Test
   * @param {string} endpoint
   * @param {string} type
   * @param {number} code
   * @param {object} [body]
   * @returns {Test}
   */
  request(endpoint, type, code, body) {
    let r = request(this.server);

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
    r = (code === STATUS_CODES.METHOD_NOT_ALLOWED) ? r.expect('Allow', 'GET') : r;

    return r
      .set('Accept', 'application/json')
      .expect(code)
  }
}

module.exports = HttpTestUtils;
