'use strict';

require('./init');
require('should');
const HttpTestUtils = require('./utils/http');
const STATUS_CODES = require('../lib/control/util/status-codes');
const testServerPort = 3000;

class MockProvider {
  constructor() {}
}

class StorageServiceMock {
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

  storage = (!storage) ? new StorageServiceMock() : storage;

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
      return util.acceptRequest(endpoint, 'GET', {}, requiredHeaders);
    });

    it('rejects all other request types', function() {
      return util.rejectOtherRequests(endpoint, ['POST', 'PUT', 'DELETE'], {}, requiredHeaders, 'GET');
    });

    it('returns the service health', function(done) {
      util.testEndpointResponse(endpoint, 'GET', STATUS_CODES.OK, {}, requiredHeaders, (err, res) => {
        res.body.should.have.property('uptime');
        res.body.should.have.property('status');
        res.body.should.have.property('version');
        done();
      });
    });
  });

  describe('/v1/token/default endpoint', function() {
    const endpoint = '/v1/token/default';

    it('accepts GET requests', function() {
      return util.acceptRequest(endpoint, 'GET', {}, requiredHeaders);
    });

    it('rejects all other request types', function() {
      return util.rejectOtherRequests(endpoint, ['POST', 'PUT', 'DELETE'], {}, requiredHeaders, 'GET');
    });

    it('returns the initial token', function(done) {
      server.close();
      server = makeServer(new StorageServiceMockWithTokenResponse());
      util = new HttpTestUtils(server);

      util.testEndpointResponse(endpoint, 'GET', STATUS_CODES.OK, {}, requiredHeaders, (err, res) => {
        res.body.should.eql('token');
        done();
      });
    });

    it('returns an error if the token cannot be retrieved', function(done) {
      server.close();
      server = makeServer(new StorageServiceMockWithError());
      util = new HttpTestUtils(server);

      util.testEndpointResponse(endpoint, 'GET', STATUS_CODES.OK, {}, requiredHeaders, (err, res) => {
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
        return util.acceptRequest(endpoint, 'GET', {}, requiredHeaders);
      });

      it('rejects all other request types', function() {
        return util.rejectOtherRequests(endpoint, ['POST', 'PUT', 'DELETE'], {}, requiredHeaders, 'GET');
      });

      it(`returns a ${el.type} secret for the specified mount and role`, function(done) {
        server.close();
        server = makeServer(new StorageServiceMockWithSecretResponse());
        util = new HttpTestUtils(server);

        util.testEndpointResponse(endpoint, 'GET', STATUS_CODES.OK, {}, requiredHeaders, (err, res) => {
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

        util.testEndpointResponse(endpoint, 'GET', STATUS_CODES.OK, {}, requiredHeaders, (err, res) => {
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
});
