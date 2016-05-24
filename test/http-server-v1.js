'use strict';

require('should');
const StorageService = require('../lib/storage-service');
const HttpTestUtils = require('./utils/http');
const testServerPort = 3000;

class StorageServiceMock {
  lookup(endpoint, callback) {
    callback(null, null);
  }
}

class StorageServiceMockWithTokenResponse {
  lookup(endpoint, callback) {
    callback(null, 'token');
  }
}

class StorageServiceMockWithSecretResponse {
  lookup(endpoint, callback) {
    callback(null, {
      username: 'bob',
      password: 'my-awesome-password123'
    });
  }
}

class StorageServiceMockWithError {
  lookup(endpoint, callback) {
    callback(new Error('Funky looking error message'), null);
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
        res.body.should.eql({
          token: 'token'
        });
        done();
      });
    });
  });

  describe('/v1/secret/default/:mount/:role endpoint', function() {
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
          error: 'Funky looking error message'
        });
        done();
      });
    });
  });
});
