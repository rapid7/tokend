'use strict';

require('./init');

const TransitProvider = require('../lib/providers/transit');
const STATUS_CODES = require('../lib/control/util/status-codes');
const preconditions = require('conditional');
const nock = require('nock');
const should = require('should');

describe('Provider/Transit', function () {
  describe('TransitProvider#constructor', function () {
    it('requires key be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider(value, 'TOKEN', {ciphertext: 'CTEXT'});
        }, preconditions.IllegalValueError, `invalid "key" argument: ${value}`);
      });
    });

    it('requires token be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider('KEY', value, {ciphertext: 'CTEXT'});
        }, preconditions.IllegalValueError, `invalid "token" argument: ${value}`);
      });
    });

    it('requires parameters be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider('KEY', 'TOKEN', value);
        }, preconditions.IllegalValueError, `invalid "parameters" argument: ${value}`);
      });
    });

    it('requires parameters.ciphertext be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider('KEY', 'TOKEN', {ciphertext: value});
        }, preconditions.IllegalValueError, `invalid "parameters.ciphertext" argument: ${value}`);
      });
    });
  });

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

  describe('TransitProvider#initialize', function () {
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

    it('calls Vault once when initializing', function (done) {
      const transit = new TransitProvider('KEY', 'TOKEN', {ciphertext: 'CTEXT'});

      localVaultMock.post('/v1/transit/decrypt/KEY', {
        ciphertext: 'CTEXT'
      })
      .reply(STATUS_CODES.OK, {
        plaintext: 'PTEXT'
      });

      transit._client.prepare(transit._token)
      .then(() => transit._client.mountTransit({token: transit._token}))
      .then(() => transit.initialize())
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
  });
});
