'use strict';

require('./init');
require('should');
const HttpTestUtils = require('./utils/http');
const STATUS_CODES = require('../lib/control/util/status-codes');
const STATUS = require('../lib/utils/status');
const testServerPort = 3000;
const AWS = require('aws-sdk-mock');
const sinon = require('sinon');

const goodDefaultToken = () => Promise.resolve({
  status: STATUS.READY,
  data: {
    token: 'sometoken'
  }
});

const badDefaultToken = () => Promise.reject(new TypeError('Invalid token.'));

const badDataDefaultToken = () => Promise.resolve({
  status: STATUS.READY,
  data: {}
});

const badStatusDefaultToken = () => Promise.resolve({
  status: STATUS.PENDING,
  data: {
    token: 'sometoken'
  }
});

class MockProvider {
  constructor() {}
}

class StorageServiceMock {
  constructor(token) {
    this.defaultToken = {
      initialize: token
    };
  }

  lookup(token, secret, ProviderType) {
    return Promise.resolve(null);
  }
}

class StorageServiceMockWithTokenResponse {
  lookup(token, secret, ProviderType) {
    return Promise.resolve('token');
  }
}

class StorageServiceMockWithSecretResponse {
  lookup(token, secret, ProviderType) {
    return Promise.resolve({
      username: 'bob',
      password: 'my-awesome-password123'
    });
  }
}

class StorageServiceMockWithTransitResponse {
  lookup(token, secret, ProviderType) {
    return Promise.resolve({
      plaintext: 'UFRFWFQ='
    });
  }
}

class StorageServiceMockWithError {
  lookup(token, secret, ProviderType) {
    return Promise.reject(new Error('Funky looking error message'));
  }
}

function makeServer(storage) {
  const app = require('express')();

  app.use(require('body-parser').json());

  storage = (!storage) ? new StorageServiceMock(goodDefaultToken) : storage;

  require('../lib/control/v1/index').attach(app, storage);

  return app.listen(testServerPort);
}

describe('v1 API', function() {
  const requiredHeaders = {
    'Content-Type': 'application/json; charset=utf-8'
  };
  let server = null,
    util = null;

  beforeEach(() => {
    server = makeServer();
    util = new HttpTestUtils(server);
  });

  afterEach((done) => {
    server.close(done);
    util = null;
  });

  it(`returns a ${STATUS_CODES.BAD_REQUEST} if 'Content-Type: application/json' is not specified`, function(done) {
    util.testEndpointResponse('/v1/transit/default/decrypt', 'POST', STATUS_CODES.BAD_REQUEST, JSON.stringify({}), {}, (err, res) => {
      res.statusCode.should.equal(STATUS_CODES.BAD_REQUEST);
      res.body.should.have.property('error');
      res.body.error.should.have.property('name');
      res.body.error.should.have.property('message');
      res.body.error.name.should.equal('TypeError');
      res.body.error.message.should.equal('Content-Type must be `application/json; charset=utf-8`.');
      done();
    });
  });

  describe('/v1/health endpoint', function() {
    const endpoint = '/v1/health';

    it('accepts GET requests', function() {
      return util.acceptRequest(endpoint, 'GET', {}, {});
    });

    it('rejects all other request types', function() {
      return util.rejectOtherRequests(endpoint, ['POST', 'PUT', 'DELETE'], {}, requiredHeaders, 'GET');
    });

    it('returns the service health', function(done) {
      util.testEndpointResponse(endpoint, 'GET', STATUS_CODES.OK, {}, {}, (err, res) => {
        res.body.should.have.property('uptime');
        res.body.should.have.property('status');
        res.body.should.have.property('version');
        res.body.should.have.property('code');
        done();
      });
    });

    [
      {
        desc: 'returns an error if an error is throw retrieving the default token.',
        method: badDefaultToken,
        status: 'Invalid token.',
        code: STATUS_CODES.SERVICE_UNAVAILABLE
      },
      {
        desc: 'returns an error if the default token is retrieved but the data from Vault is somehow bad.',
        method: badDataDefaultToken,
        status: 'No token data.',
        code: 'NOTOKENDATA'
      },
      {
        desc: 'returns an error if the default token is retrieved but is not ready.',
        method: badStatusDefaultToken,
        status: 'Manager is not ready.',
        code: 'MANAGERNOTREADY'
      }].forEach((test) => {
        it(test.desc, function(done) {
          server.close();
          server = makeServer(new StorageServiceMock(test.method));
          util = new HttpTestUtils(server);

          util.testEndpointResponse(endpoint, 'GET', STATUS_CODES.SERVICE_UNAVAILABLE, {}, {}, (err, res) => {
            res.body.should.have.property('uptime');
            res.body.should.have.property('status');
            res.body.should.have.property('version');
            res.body.should.have.property('code');

            res.body.status.should.equal(test.status);
            res.body.code.should.equal(test.code);
            done();
          });
        });
      });
  });

  describe('/v1/token/default endpoint', function() {
    const endpoint = '/v1/token/default';

    it('accepts GET requests', function() {
      return util.acceptRequest(endpoint, 'GET', {}, {});
    });

    it('rejects all other request types', function() {
      return util.rejectOtherRequests(endpoint, ['POST', 'PUT', 'DELETE'], {}, requiredHeaders, 'GET');
    });

    it('returns the initial token', function(done) {
      server.close();
      server = makeServer(new StorageServiceMockWithTokenResponse());
      util = new HttpTestUtils(server);

      util.testEndpointResponse(endpoint, 'GET', STATUS_CODES.OK, {}, {}, (err, res) => {
        res.body.should.eql('token');
        done();
      });
    });

    it('returns an error if the token cannot be retrieved', function(done) {
      server.close();
      server = makeServer(new StorageServiceMockWithError());
      util = new HttpTestUtils(server);

      util.testEndpointResponse(endpoint, 'GET', STATUS_CODES.OK, {}, {}, (err, res) => {
        res.body.should.eql({
          error: {
            message: 'Funky looking error message',
            name: 'Error'
          }
        });
        done();
      });
    });
  });

  [
      {type: 'cubbyhole', endpoint: '/v1/cubbyhole/default/foo/bar'},
      {type: 'secret', endpoint: '/v1/secret/default/foo/bar'}
  ].forEach(function(el) {
    describe(`/v1/${el.type}/:token/:path endpoint`, function() {
      const endpoint = el.endpoint;

      it('accepts GET requests', function() {
        return util.acceptRequest(endpoint, 'GET', {}, {});
      });

      it('rejects all other request types', function() {
        return util.rejectOtherRequests(endpoint, ['POST', 'PUT', 'DELETE'], {}, requiredHeaders, 'GET');
      });

      it(`returns a ${el.type} secret for the specified mount and role`, function(done) {
        server.close();
        server = makeServer(new StorageServiceMockWithSecretResponse());
        util = new HttpTestUtils(server);

        util.testEndpointResponse(endpoint, 'GET', STATUS_CODES.OK, {}, {}, (err, res) => {
          res.body.should.eql({
            username: 'bob',
            password: 'my-awesome-password123'
          });
          done();
        });
      });

      it('returns an error if the specified mount and role combination doesn\'t exist', function(done) {
        server.close();
        server = makeServer(new StorageServiceMockWithError());
        util = new HttpTestUtils(server);

        util.testEndpointResponse(endpoint, 'GET', STATUS_CODES.OK, {}, {}, (err, res) => {
          res.body.should.eql({
            error: {
              message: 'Funky looking error message',
              name: 'Error'
            }
          });
          done();
        });
      });
    });
  });

  describe('/v1/transit/default/decrypt endpoint', function() {
    const endpoint = '/v1/transit/default/decrypt';
    const body = {key: 'KEY', ciphertext: 'CTEXT'};

    it('accepts POST requests', function() {
      return util.acceptRequest(endpoint, 'POST', JSON.stringify(body), requiredHeaders);
    });

    it('rejects non-POST requests', function() {
      return util.rejectOtherRequests(endpoint, ['GET', 'PUT', 'DELETE'], JSON.stringify(body), requiredHeaders, 'POST');
    });

    it('decodes Base64 encoded secrets', function(done) {
      server.close();
      server = makeServer(new StorageServiceMockWithTransitResponse());
      util = new HttpTestUtils(server);

      util.testEndpointResponse(endpoint, 'POST', STATUS_CODES.OK, JSON.stringify(body), requiredHeaders, (err, res) => {
        res.body.should.eql({
          plaintext: 'PTEXT'
        });

        done();
      });
    });

    it('bubbles errors up to the caller', function(done) {
      server.close();
      server = makeServer(new StorageServiceMockWithError());
      util = new HttpTestUtils(server);

      util.testEndpointResponse(endpoint, 'POST', STATUS_CODES.BAD_REQUEST, JSON.stringify(body), requiredHeaders, (err, res) => {
        if (err) {
          return done(err);
        }

        res.body.should.eql({
          error: {
            message: 'Funky looking error message',
            name: 'Error'
          }
        });

        done();
      });
    });
  });

  describe('/v1/kms/decrypt endpoint', function() {
    const StorageService = require('../lib/storage-service');
    const s = new StorageService();

    beforeEach(function() {
      server.close();
      server = makeServer(s);
      util = new HttpTestUtils(server);

      AWS.mock('KMS', 'decrypt', function(params, callback) {
        callback(null, {
          KeyId: 'arn:aws:kms:us-east-1:ACCOUNT:key/SOME-UUID',
          PlainText: Buffer.from('this-is-a-secret', 'utf8').toString('base64')
        });
      });
    });

    afterEach(function() {
      AWS.restore();
    });

    const endpoint = '/v1/kms/decrypt';
    const body = {ciphertext: 'CTEXT', region: 'us-east-1'};

    it('accepts POST requests', function() {
      return util.acceptRequest(endpoint, 'POST', JSON.stringify(body), requiredHeaders);
    });

    it('rejects non-POST requests', function() {
      return util.rejectOtherRequests(endpoint, ['GET', 'PUT', 'DELETE'], JSON.stringify(body), requiredHeaders, 'POST');
    });

    it('decodes Base64 encoded secrets', function(done) {
      util.testEndpointResponse(endpoint, 'POST', STATUS_CODES.OK, JSON.stringify(body), requiredHeaders, (err, res) => {
        res.body.should.eql({
          keyid: 'arn:aws:kms:us-east-1:ACCOUNT:key/SOME-UUID',
          plaintext: 'this-is-a-secret'
        });

        done();
      });
    });

    it('bubbles errors up to the caller', function(done) {
      AWS.restore();
      AWS.mock('KMS', 'decrypt', function(params, callback) {
        callback(new Error('Funky looking error message'), null);
      });

      util.testEndpointResponse(endpoint, 'POST', STATUS_CODES.BAD_REQUEST, JSON.stringify(body), requiredHeaders, (err, res) => {
        if (err) {
          return done(err);
        }

        res.body.should.eql({
          error: {
            message: 'Funky looking error message',
            name: 'Error'
          }
        });

        done();
      });
    });

    it('has a correlation id in the StorageService', function() {
      const KMSProvider = require('../lib/providers/kms');

      return s.lookup('', body, KMSProvider).then((result) => {
        result.should.have.property('correlation_id');
      });
    });

    it('does not have a correlation id in the response', function(done) {
      util.testEndpointResponse(endpoint, 'POST', STATUS_CODES.OK, body, requiredHeaders, (err, res) => {
        res.body.should.not.have.property('correlation_id');
        done();
      });
    });

    it('doesn\'t use the StorageService', function(done) {
      const stub = sinon.stub(s, 'lookup').returns(Promise.resolve({
        KeyId: 'arn:aws:kms:us-east-1:ACCOUNT:key/SOME-UUID',
        PlainText: Buffer.from('this-is-a-secret', 'utf8').toString('base64')
      }));

      util.testEndpointResponse(endpoint, 'POST', STATUS_CODES.OK, JSON.stringify(body), requiredHeaders, (err, res) => {
        stub.called.should.be.false();
        stub.reset();
        done();
      });
    });
  });
});
