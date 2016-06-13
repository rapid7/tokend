/* global Config */
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

  return nock(vaultHostname)
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

describe('Provider/Generic', function () {
  let scope;

  beforeEach(function () {
    scope = createHttpMock();
  });

  afterEach(function () {
    nock.removeInterceptor(scope);
  });

  describe('GenericProvider#constructor', function () {
    it('throws an IllegalValueError if the path is not provided in the constructor', function () {
      (() => new GenericProvider('', 'totally-not-a-token')).should.throw(preconditions.IllegalValueError);
    });

    it('throws an IllegalValueError if the token is not provided in the constructor', function () {
      (() => new GenericProvider('path-to-secret', '')).should.throw(preconditions.IllegalValueError);
    });
  });

  it('can only be initialized once', function (done) {
    scope.get('/v1/secret/coolsecret').reply(STATUS_CODES.OK, Object.assign({
      data: {value: 'coolvalue'},
      lease_duration: 2592000
    }, resp));

    const g = new GenericProvider('coolsecret', 'a-valid-token');

    return promisify((d) => g.initialize(d))
      .then(() => g.initialize((err, data) => {
        should(err).be.Error('Already initialized');
        should(data).be.null();
        done();
      }));
  });

  describe('Valid secrets', function() {
    it('executes the callback with the secret when initialized with a valid path and token', function (done) {
      const expectedResponse = Object.assign({
        data: {value: 'coolvalue'},
        lease_duration: 2592000
      }, resp);

      scope.get('/v1/secret/coolsecret').reply(STATUS_CODES.OK, expectedResponse);

      const g = new GenericProvider('coolsecret', 'a-valid-token');

      return promisify((d) => g.initialize(d))
        .then((data) => data.should.eql(expectedResponse))
        .then(() => done())
        .catch((err) => done(err));
    });

    it('executes the callback with the cached secret if the secret TTL has not expired', function (done) {
      const expectedResponse = Object.assign({
        data: {value: 'coolvalue'},
        lease_duration: 2592000
      }, resp);

      scope.get('/v1/secret/coolsecret').reply(STATUS_CODES.OK, expectedResponse);

      const g = new GenericProvider('coolsecret', 'a-valid-token');
      const cachedSecret = {value: 'coolvalue'};

      return promisify((d) => g.initialize(d))
        .then((data) => {
          return data.should.eql(expectedResponse);
        })
        .then(g.renew.bind(g, ((err, data) => {
          return data.should.eql(expectedResponse);
        })))
        .then(() => done())
        .catch((err) => done(err));
    });

    it('attempts to re-read the secret if the secret TTL has expired', function (done) {
      const expectedResponse1 = Object.assign({
        data: {value: 'coolvalue'},
        lease_duration: 0
      }, resp);
      const expectedResponse2 = Object.assign({
        data: {value: 'coolvalue2'},
        lease_duration: 2592000
      }, resp);

      scope.get('/v1/secret/coolsecret').reply(STATUS_CODES.OK, expectedResponse1)
        .get('/v1/secret/coolsecret').reply(STATUS_CODES.OK, expectedResponse2);

      const g = new GenericProvider('coolsecret', 'a-valid-token');

      return promisify((d) => g.initialize(d))
          .then((data) => data.should.eql(expectedResponse1))
          .then(() => g.renew(((err, data) => {
            should(err).equal(null);
            data.should.eql(expectedResponse2);
          })))
          .then(done)
          .catch((err) => done(err));
    });
  });

  describe('Invalid secrets', function () {
    beforeEach(function () {
      scope = createHttpMock();
      scope.get('/v1/secret/notasecret').reply(STATUS_CODES.NOT_FOUND, {errors: []});
    });

    afterEach(function () {
      nock.removeInterceptor(scope);
    });

    it('executes the callback with an error if the path or token is invalid', function (done) {
      const g = new GenericProvider('notasecret', 'a-valid-token');

      g.initialize((err, data) => {
        should(data).be.null();
        err.should.be.an.Error();
        done();
      });
    });
  });
});
