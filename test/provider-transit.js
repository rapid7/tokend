'use strict';

require('./init');

const TransitProvider = require('../lib/providers/transit');
const STATUS_CODES = require('../lib/control/util/status-codes');
const preconditions = require('conditional');
const nock = require('nock');
const should = require('should');

/**
 * Create a mock Vault server
 *
 * @param {Object} options - Options to use when setting up a mock Vault server
 * @param {Boolean} options.global - True if the mocked Vault server should define setup API calls
 * @return {Nock} - The mock Vault server
 */
function createVaultMock(options) {
  const vaultHostname = `${(Config.get('vault:tls')) ? 'https' : 'http'}://${Config.get('vault:host')}:${Config.get('vault:port')}/`;

  if (!options.global) {
    return nock(vaultHostname);
  }

  return nock(vaultHostname).persist()
    .get('/v1/sys/init')
    .reply(STATUS_CODES.OK, {initialized: true})
    .get('/v1/sys/seal-status')
    .reply(STATUS_CODES.OK, {sealed: false, t: 1, n: 1, progress: 1})
    .get('/v1/sys/mounts')
    .reply(STATUS_CODES.OK, {'transit/': {config: {default_lease_ttl: 0, max_lease_ttl: 0}, type: 'transit'}})
    .get('/v1/sys/auth')
    .reply(STATUS_CODES.OK, {'token/': {type: 'token'}})
    .post('/v1/sys/mounts/transit', {type: 'transit', description: 'Transit Secrets Backend transit'})
    .reply(STATUS_CODES.OK, {'token/': {type: 'token'}});
}

describe('Provider/Transit', function () {
  let globalVaultMock = null,
      localVaultMock = null;

  before(function () {
    globalVaultMock = createVaultMock({global: true});
  });

  beforeEach(function () {
    localVaultMock = createVaultMock({global: false});
  });

  afterEach(function () {
    nock.removeInterceptor(localVaultMock);
  });

  after(function () {
    nock.removeInterceptor(globalVaultMock);
  });

  describe('TransitProvider#constructor', function () {
    it('requires secret be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider(value, 'TOKEN');
        }, preconditions.IllegalValueError, `invalid "secret" argument: ${value}`);
      });
    });

    it('requires token be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider({key: 'KEY', ciphertext: 'CTEXT'}, value);
        }, preconditions.IllegalValueError, `invalid "token" argument: ${value}`);
      });
    });

    it('requires secret.key be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider({key: value, ciphertext: 'CTEXT'}, 'TOKEN');
        }, preconditions.IllegalValueError, `invalid "secret.key" argument: ${value}`);
      });
    });

    it('requires secret.ciphertext be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider({key: 'KEY', ciphertext: value}, 'TOKEN');
        }, preconditions.IllegalValueError, `invalid "secret.ciphertext" argument: ${value}`);
      });
    });
  });

  describe('TransitProvider#initialize', function () {
    it('calls Vault once when initializing', function (done) {
      const transit = new TransitProvider({key: 'KEY', ciphertext: 'CTEXT'}, 'TOKEN');

      localVaultMock.post('/v1/transit/decrypt/KEY', {
        ciphertext: 'CTEXT'
      })
      .reply(STATUS_CODES.OK, {
        plaintext: 'PTEXT'
      });

      transit.initialize()
      .then((retrievedPlaintext) => {
        should(retrievedPlaintext).eql({
          plaintext: 'PTEXT'
        });
      })
      .then(() => transit.initialize())
      .then((cachedPlaintext) => {
        should(cachedPlaintext).eql({
          plaintext: 'PTEXT'
        });

        localVaultMock.done();
        done();
      })
      .catch(done);
    });

    it('fails with an error if the key does not exist', function (done) {
      const transit = new TransitProvider({key: 'INVALID-KEY', ciphertext: 'CTEXT'}, 'TOKEN');

      localVaultMock.post('/v1/transit/decrypt/INVALID-KEY', {
        ciphertext: 'CTEXT'
      })
      .reply(STATUS_CODES.BAD_REQUEST, {
        errors: ['policy not found']
      });

      transit.initialize()
      .then(() => done(new Error('Invalid keys should fail!')))
      .catch((err) => {
        should(err).be.instanceOf(Error);

        localVaultMock.done();
        done();
      });
    });
  });

  describe('TransitProvider#renew', function () {
    it('calls Vault every time when renewing', function (done) {
      const transit = new TransitProvider({key: 'KEY', ciphertext: 'CTEXT'}, 'TOKEN');

      localVaultMock.post('/v1/transit/decrypt/KEY', {
        ciphertext: 'CTEXT'
      })
      .reply(STATUS_CODES.OK, {
        plaintext: 'PTEXT'
      })
      .post('/v1/transit/decrypt/KEY', {
        ciphertext: 'CTEXT'
      })
      .reply(STATUS_CODES.OK, {
        plaintext: 'PTEXT'
      });

      transit.renew()
      .then((retrievedPlaintext) => {
        should(retrievedPlaintext).eql({
          plaintext: 'PTEXT'
        });
      })
      .then(() => transit.renew())
      .then((renewedPlaintext) => {
        should(renewedPlaintext).eql({
          plaintext: 'PTEXT'
        });

        localVaultMock.done();
        done();
      })
      .catch(done);
    });

    it('fails with an error if the key does not exist', function (done) {
      const transit = new TransitProvider({key: 'INVALID-KEY', ciphertext: 'CTEXT'}, 'TOKEN');

      localVaultMock.post('/v1/transit/decrypt/INVALID-KEY', {
        ciphertext: 'CTEXT'
      })
      .reply(STATUS_CODES.BAD_REQUEST, {
        errors: ['policy not found']
      });

      transit.renew()
      .then(() => done(new Error('Invalid keys should fail!')))
      .catch((err) => {
        should(err).be.instanceOf(Error);

        localVaultMock.done();
        done();
      });
    });
  });
});
