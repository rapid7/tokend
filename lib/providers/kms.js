'use strict';

const preconditions = require('conditional');
const promisify = require('./../utils/promisify');
const checkNotEmpty = preconditions.checkNotEmpty;
const AWS = require('aws-sdk');

/**
 * Provider for KMS encrypted secrets
 */
class KMSProvider {
    /**
   * Create a new instance of the `KMSProvider`.
   *
   * @param {Object} secret
   */
  constructor(secret) {
    checkNotEmpty(secret, 'secret is required');
    checkNotEmpty(secret.ciphertext, 'secret.ciphertext is required');

    let region = 'us-east-1';


    if (secret.region && secret.region != null && secret.region !== '') { // eslint-disable-line eqeqeq
      region = secret.region;
    } else if (Config.get('kms:region') && Config.get('kms:region') !== '') {
      region = Config.get('kms:region');
    }


    this._parameters = {
      CiphertextBlob: Buffer.from(secret.ciphertext, 'base64')
    };

    this._client = new AWS.KMS({region});
  }


  /**
   * Initialize the credentials
   * @returns {Promise}
   */
  initialize() {
    return this._decrypt();
  }

  /**
   * Retrieve and decrypt data from KMS
   * @return {Promise}
   * @private
   */
  _decrypt() {
    return promisify((done) => this._client.decrypt(this._parameters, done))
      .then((data) => ({data}));
  }

  /**
   * Removes cached data
   *
   * This is stubbed to conform to the Provider interface
   */
  invalidate() { }
}

module.exports = KMSProvider;
