'use strict';

const KMSProvider = require('../lib/providers/kms');
const AWS = require('aws-sdk-mock');
const should = require('should');
const preconditions = require('conditional');
const UUID = require('uuid');
const crypto = require('crypto');

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
        should.throws(() => new KMSProvider({key: 'KEY', ciphertext: value}),
            preconditions.IllegalValueError,
            `invalid "secret.ciphertext" argument: ${value}`);
      });
    });

    it('validates secret.region, falls back to default (not in config) if not provided', function() {
      [null, undefined, ''].forEach(function(value) {
        const provider = new KMSProvider({key: 'KEY', ciphertext: 'ctext', region: value});

        provider._client.config.region.should.equal('us-east-1');
      });
    });

    it('instantiates the KMS client with the specified region', function() {
      const region = 'eu-central-1';
      const provider = new KMSProvider({ciphertext: 'foo', region});

      provider._client.config.region.should.equal(region);
    });

    it('validates region in config, falls back to default if not provided', function() {
      const _Config = global.Config;

      [null, undefined, ''].forEach(function(value) {
        global.Config = {
          get: (() => value)
        };
        const provider = new KMSProvider({ciphertext: 'ctext'});

        provider._client.config.region.should.equal('us-east-1');
      });
      global.Config = _Config;
    });

    it('instantiates the KMS client with value provided in config (if region not provided)', function() {
      const _Config = global.Config;
      const region = 'eu-central-1';

      global.Config = {
        get: (() => region)
      };
      const provider = new KMSProvider({ciphertext: 'ctext'});

      provider._client.config.region.should.equal(region);
      global.Config = _Config;
    });

    it('sets the _datakey property if a datakey value is provided', function() {
      const provider = new KMSProvider({ciphertext: 'foo', region: 'us-east-1', datakey: 'foobar'});

      provider._datakey.should.be.true();
    });

    it('sets the CiphertextBlob property of _parameters to the base64 encoded datakey', function() {
      const provider = new KMSProvider({ciphertext: 'foo', region: 'us-east-1', datakey: 'foobar'});

      provider._parameters.CiphertextBlob.should.eql(Buffer.from('foobar', 'base64'));
    });
  });

  describe('KMSProvider#initialize', function() {
    const plaintext = Buffer.from('this-is-a-secret', 'utf-8').toString('base64');
    const validResponse = {
      KeyId: 'arn:aws:kms:us-east-1:ACCOUNT:key/SOME-UUID',
      Plaintext: Buffer.from(plaintext, 'base64')
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
        data.data.should.have.keys(['Plaintext', 'KeyId']);
        Buffer.from(data.data.Plaintext, 'base64').toString().should.equal('this-is-a-secret');
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

    it('deciphers the ciphertext if a valid datakey is provided', function() {
      AWS.mock('KMS', 'decrypt', function(params, callback) {
        callback(null, validResponse);
      });

      const secret = 'foo';
      const cipher = crypto.createCipher('aes-256-cbc', 'this-is-a-secret');
      let ciphertext = cipher.update(secret, 'utf8', 'base64');

      ciphertext += cipher.final('base64');

      const provider = new KMSProvider({ciphertext, region: 'us-east-1', datakey: plaintext});

      return provider.initialize().then((data) => {
        data.should.have.keys('data');
        data.data.should.have.keys(['Plaintext', 'KeyId']);
        Buffer.from(data.data.Plaintext, 'base64').toString().should.equal(secret);
      });
    });
  });
});
