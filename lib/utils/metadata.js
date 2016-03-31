'use strict';

const http = require('http');

class Metadata {
  /**
   * Constructor
   * @param {string} host
   */
  constructor(host) {
    this.host = host;

    this.endpoints = [
      [this._dynamic, 'document'].join('/'),
      [this._dynamic, 'signature'].join('/'),
      [this._dynamic, 'pkcs7'].join('/')
    ];
  }

  /**
   * Entry point for retrieving data from the EC2 dynamic instance-identity endpoints
   * @returns {Promise}
   */
  get() {
    return Promise.all(this.endpoints.map((el) => this._get(el)));
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

  /**
   * The base path for dynamic metadata requests
   * @returns {string}
   * @private
   */
  get _dynamic() {
    return [this.host, 'latest', 'dynamic', 'instance-identity'].join('/');
  }
}

module.exports = Metadata;
