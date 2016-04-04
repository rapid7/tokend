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
   * Wrap a promise around a MetadataService request
   * @param {string} url
   * @returns {Promise}
   * @private
   */
  _get(url) {
    return new Promise((resolve, reject) => {
      this.service.request(url, (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data);
      });
    });
  }
}

module.exports = Metadata;
