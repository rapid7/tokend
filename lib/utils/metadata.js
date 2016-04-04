'use strict';

const AWS = require('aws-sdk');

const ENDPOINTS = [
  '/' + ['latest', 'dynamic', 'instance-identity', 'document'].join('/'),
  '/' + ['latest', 'dynamic', 'instance-identity', 'signature'].join('/'),
  '/' + ['latest', 'dynamic', 'instance-identity', 'pkcs7'].join('/')
];

class Metadata {
  /**
   * Constructor
   * @param {string} host
   */
  constructor(host) {
    this.host = host;
    this.service = new AWS.MetadataService({host})
  }

  /**
   * Entry point for retrieving data from the EC2 dynamic instance-identity endpoints
   * @returns {Promise}
   */
  get() {
    return Promise.all(ENDPOINTS.map((el) => this._get(el)));
  }

  /**
   * Wrap a promise around an HTTP request
   * @param {string} url
   * @returns {Promise}
   * @private
   */
  _get(url) {
    return new Promise((resolve, reject) => {
      let data = '';

      http.get(url, (res) => {
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));

      }).on('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports = Metadata;
