'use strict';

const KMSProvider = require('../lib/providers/kms');
const AWS = require('aws-sdk-mock');
const should = require('should');
const preconditions = require('conditional');
const UUID = require('node-libuuid');

/**
 * Generate an AWS-like error message for mocking bad KMS requests
 * @param {string} type
 * @returns {Error}
 */
function generateKMSError(type) {
  const e = new Error();

  e.code = type;
  e.message = null;
  e.name = type;
  e.requestId = UUID.v4();
  e.retryDelay = parseFloat(Math.min(Math.random() * 5, 5)); // Generate random num between 0 and 5 and parse as float
  e.retryable = false;

  return e;
}

describe('Provider/KMS', function() {
  describe('KMSProvider#constructor', function() {
    it('requires secret be provided', function() {
      [null, undefined, ''].forEach(function(value) {
        should.throws(() => new KMSProvider(value),
            preconditions.IllegalValueError,
            `invalid "secret" argument: ${value}`);
      });
    });

    it('requires secret.ciphertext be provided', function() {
      [null, undefined, ''].forEach(function(value) {
        should.throws(() => new KMSProvider({key: 'KEY', ciphertext: value, region: 'region'}),
            preconditions.IllegalValueError,
            `invalid "secret.ciphertext" argument: ${value}`);
      });
    });

    it('requires secret.region be provided', function() {
      [null, undefined, ''].forEach(function(value) {
        should.throws(() => new KMSProvider({key: 'KEY', ciphertext: 'ciphertext', region: value}),
            preconditions.IllegalValueError,
            `invalid "secret.region" argument: ${value}`);
      });
    });

    describe('KMSProvider#initialize', function() {
      const validResponse = {
        KeyId: 'arn:aws:kms:us-east-1:ACCOUNT:key/SOME-UUID',
        PlainText: Buffer.from('this-is-a-secret', 'utf8').toString('base64')
      };

      afterEach(function() {
        AWS.restore();
      });

      it('returns decrypted data if the ciphertext is valid', function() {
        AWS.mock('KMS', 'decrypt', function(params, callback) {
          callback(null, validResponse);
        });
        const provider = new KMSProvider({ciphertext: 'foo', region: 'us-east-1'});

        return provider.initialize().then((data) => {
          data.should.have.keys('data');
          data.data.should.have.keys(['PlainText', 'KeyId']);
          Buffer.from(data.data.PlainText, 'base64').toString().should.equal('this-is-a-secret');
        });
      });

      it('returns an error if the ciphertext is invalid', function() {
        AWS.mock('KMS', 'decrypt', function(params, callback) {
          // KMS.decrypt returns an error in the node (err, data) CB form
          callback(generateKMSError('InvalidCiphertextException'), null);
        });
        const provider = new KMSProvider({ciphertext: 'foo', region: 'us-east-1'});

        return provider.initialize().catch((err) => {
          err.name.should.equal('InvalidCiphertextException');
        });
      });

      it('instantiates the KMS client with the specified region', function() {
        const region = 'us-east-1';
        const provider = new KMSProvider({ciphertext: 'foo', region});

        provider._client.config.region.should.equal(region);
      });
    });
  });
});
