'use strict';

const chai = require('chai');
const sinon = require('sinon');
const should = require('should');
const nock = require('nock');
const preconditions = require('conditional');
const GenericProvider = require('../lib/providers/generic');
const promisify = require('../lib/utils/promisify');
const STATUS_CODES = require('../lib/control/util/status-codes');

chai.use(require('chai-as-promised'));

function createHttpMock() {
  const vaultHostname = `${(Config.get('vault:tls')) ? 'https' : 'http'}://${Config.get('vault:host')}:${Config.get('vault:port')}/`;

  return nock(vaultHostname).persist()
      .get('/v1/sys/init')
      .reply(STATUS_CODES.OK, {initialized: true})
      .get('/v1/sys/seal-status')
      .reply(STATUS_CODES.OK, {sealed: false, t: 1, n: 1, progress: 1})
      .get('/v1/sys/mounts')
      .reply(STATUS_CODES.OK, {'secret/': {config: {default_lease_ttl: 0, max_lease_ttl: 0}, type: 'generic'}})
      .get('/v1/sys/auth')
      .reply(STATUS_CODES.OK, {'token/': {type: 'token'}});
}

const resp = {
  auth: null,
  lease_id: '',
  renewable: false,
  warnings: null
};

describe('Provider/Generic', function() {
  let scope;

  beforeEach(function() {
    scope = createHttpMock();
  });

  afterEach(function() {
    nock.removeInterceptor(scope);
  });

  describe('GenericProvider#constructor', function() {
    it('throws an IllegalValueError if the path is not provided in the constructor', function() {
      (() => new GenericProvider('', 'totally-not-a-token')).should.throw(preconditions.IllegalValueError);
    });

    it('throws an IllegalValueError if the token is not provided in the constructor', function() {
      (() => new GenericProvider('path-to-secret', '')).should.throw(preconditions.IllegalValueError);
    });
  });

  describe('GenericProvider#invalidate', function() {
    it('Clears the provider\'s data if #invalidate() is called', function() {
      scope.get('/v1/secret/coolsecret').reply(STATUS_CODES.OK, Object.assign({
        data: {value: 'coolvalue'},
        lease_duration: 2592000
      }, resp));

      const g = new GenericProvider('coolsecret', 'a-valid-token');

      // We're testing the Generic provider (and by extension the secret and cubbyhole providers) so to hit
      // the right endpoint we need to provide the method name to read the secret endpoint.
      g._method = 'read';

      return g.initialize().then(() => {
        should(g.data).not.be.null();
        g.invalidate();
        should(g.data).be.null();
      });
    });
  });

  it('can only be initialized once', function() {
    scope.get('/v1/secret/coolsecret').reply(STATUS_CODES.OK, Object.assign({
      data: {value: 'coolvalue'},
      lease_duration: 2592000
    }, resp));

    const g = new GenericProvider('coolsecret', 'a-valid-token');

    // We're testing the Generic provider (and by extension the secret and cubbyhole providers) so to hit
    // the right endpoint we need to provide the method name to read the secret endpoint.
    g._method = 'read';

    return g.initialize().then(() => {
      g.initialize().then((data) => {
        should(data).be.null();
      }).catch((err) => {
        should(err).be.Error('Already initialized');
      });
    });
  });

  describe('Valid secrets', function() {
    it('executes the callback with the secret when initialized with a valid path and token', function() {
      const expectedResponse = Object.assign({
        data: {value: 'coolvalue'},
        lease_duration: 2592000
      }, resp);

      scope.get('/v1/secret/coolsecret').reply(STATUS_CODES.OK, expectedResponse);

      const g = new GenericProvider('coolsecret', 'a-valid-token');

      // We're testing the Generic provider (and by extension the secret and cubbyhole providers) so to hit
      // the right endpoint we need to provide the method name to read the secret endpoint.
      g._method = 'read';

      return g.initialize().then((data) => data.should.eql(expectedResponse));
    });

    it('attempts to re-read the secret when renewed', function() {
      const expectedResponse = Object.assign({
        data: {value: 'coolvalue'},
        lease_duration: 2592000
      }, resp);

      scope.get('/v1/secret/coolsecret')
          .reply(STATUS_CODES.OK, expectedResponse)
          .get('/v1/secret/coolsecret')
          .reply(STATUS_CODES.OK, expectedResponse);

      const g = new GenericProvider('coolsecret', 'a-valid-token');

      // We're testing the Generic provider (and by extension the secret and cubbyhole providers) so to hit
      // the right endpoint we need to provide the method name to read the secret endpoint.
      g._method = 'read';

      return g.initialize()
        .then((data) => data.should.eql(expectedResponse))
        .then(() => {
          g.renew().then((data) => {
            data.should.eql(expectedResponse);
          });
        });
    });
  });

  describe('Invalid secrets', function() {
    beforeEach(function() {
      scope = createHttpMock();
      scope.get('/v1/secret/notasecret').reply(STATUS_CODES.NOT_FOUND, {errors: []});
    });

    afterEach(function() {
      nock.removeInterceptor(scope);
    });

    it('executes the callback with an error if the path or token is invalid', function() {
      const g = new GenericProvider('notasecret', 'a-valid-token');

      // We're testing the Generic provider (and by extension the secret and cubbyhole providers) so to hit
      // the right endpoint we need to provide the method name to read the secret endpoint.
      g._method = 'read';

      return g.initialize().then((data) => {
        should(data).be.null();
      }).catch((err) => {
        err.should.be.an.Error();
      });
    });
  });
});
