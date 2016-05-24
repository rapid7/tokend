'use strict';

const request = require('supertest');

const HTTP_OK = 200;
const HTTP_METHOD_NOT_ALLOWED = 405;

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
    return this.request(endpoint, 'GET', HTTP_OK);
  }

  /**
   * Reject any other request type
   * @param {string} endpoint
   * @returns {Test}
   */
  rejectOtherRequests(endpoint) {
    this.request(endpoint, 'POST', HTTP_METHOD_NOT_ALLOWED);
    this.request(endpoint, 'PUT', HTTP_METHOD_NOT_ALLOWED);
    return this.request(endpoint, 'DELETE', HTTP_METHOD_NOT_ALLOWED);
  }

  /**
   * Execute a callback against a supertest request
   * @param {string} endpoint
   * @param {function} callback
   * @returns {Test}
   */
  testEndpointResponse(endpoint, callback) {
    return this.request(endpoint, 'GET', HTTP_OK).end(callback);
  }

  /**
   * Create the supertest Test
   * @param {string} endpoint
   * @param {string} type
   * @param {number} code
   * @returns {Test}
   */
  request(endpoint, type, code) {
    let r = request(this.server);

    switch (type) {
      case 'GET':
        r = r.get(endpoint);
        break;
      case 'POST':
        r = r.post(endpoint);
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

    r = (code === HTTP_OK) ? r.expect('Content-Type', 'application/json; charset=utf-8') : r;
    r = (code === HTTP_METHOD_NOT_ALLOWED) ? r.expect('Allow', 'GET') : r;

    return r
      .set('Accept', 'application/json')
      .expect(code)
  }
}

module.exports = HttpTestUtils;
