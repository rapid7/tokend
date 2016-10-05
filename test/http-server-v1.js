'use strict';

require('./init');
require('should');
const StorageService = require('../lib/storage-service');
const HttpTestUtils = require('./utils/http');
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

describe('v1 API', function () {
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

  describe('/v1/health endpoint', function() {
    const endpoint = '/v1/health';

    it('accepts GET requests', function(done) {
      util.acceptGETRequest(endpoint).end(done);
    });

    it('rejects all other request types', function(done) {
      util.rejectOtherRequests(endpoint).end(done);
    });

    it('returns the service health', function(done) {
      util.testEndpointResponse(endpoint, (err, res) => {
        res.body.should.have.property('uptime');
        res.body.should.have.property('status');
        res.body.should.have.property('version');
        done();
      });
    });
  });

  describe('/v1/token/default endpoint', function() {
    const endpoint = '/v1/token/default';

    it('accepts GET requests', function(done) {
      util.acceptGETRequest(endpoint).end(done);
    });

    it('rejects all other request types', function(done) {
      util.rejectOtherRequests(endpoint).end(done);
    });

    it('returns the initial token', function(done) {
      server.close();
      server = makeServer(new StorageServiceMockWithTokenResponse());
      util = new HttpTestUtils(server);

      util.testEndpointResponse(endpoint, (err, res) => {
        res.body.should.eql('token');
        done();
      });
    });

    it('returns an error if the token cannot be retrieved', function (done) {
      server.close();
      server = makeServer(new StorageServiceMockWithError());
      util = new HttpTestUtils(server);

      util.testEndpointResponse(endpoint, (err, res) => {
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

  describe('/v1/secret/:token/:path endpoint', function() {
    const endpoint = '/v1/secret/default/foo/bar';

    it('accepts GET requests', function(done) {
      util.acceptGETRequest(endpoint).end(done);
    });

    it('rejects all other request types', function(done) {
      util.rejectOtherRequests(endpoint).end(done);
    });

    it('returns a secret for the specified mount and role', function(done) {
      server.close();
      server = makeServer(new StorageServiceMockWithSecretResponse());
      util = new HttpTestUtils(server);

      util.testEndpointResponse(endpoint, (err, res) => {
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

      util.testEndpointResponse(endpoint, (err, res) => {
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

  describe('/v1/transit/default/decrypt endpoint', function () {
    const endpoint = '/v1/transit/default/decrypt';
    const body = {key: 'KEY', ciphertext: 'CTEXT'};

    it('accepts POST requests', function (done) {
      util.acceptPOSTRequest(endpoint, body).end(done);
    });

    it('rejects non-POST requests', function () {
      return util.rejectNonPOSTRequests(endpoint, body);
    });

    it('decodes Base64 encoded secrets', function (done) {
      server.close();
      server = makeServer(new StorageServiceMockWithTransitResponse());
      util = new HttpTestUtils(server);

      util.testEndpointPOSTResponse(endpoint, body, (err, res) => {
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

      util.testEndpointPOSTResponse(endpoint, body, (err, res) => {
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
