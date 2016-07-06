'use strict';

const should = require('should');

const LeaseManager = require('../lib/lease-manager');
const StorageService = require('../lib/storage-service');

/**
 * A mock SecretProvider that fails to initialize N times before succeeding
 *
 */
class ImmediateInitializeProvider {

  initialize(callback) {
    callback(null, {data: 'SECRET'});
  }
}

class MockTokenProvider {
  initialize(callback) {
    callback(null, {
      lease_id: 'token',
      lease_duration: 60,
      data: {
        token: 'this-is-a-unique-token'
      }
    });
  }
}

class MockSecretProvider {
  constructor(secret, token) {
    this.token = token;
    this.secret = secret;
  }

  initialize(callback) {
    callback(null, {
      lease_id: 'token',
      lease_duration: 60,
      data: {
        somesecret: 'SUPERSECRET'
      }
    });
  }
}

class DelayedInitializeProvider {

  constructor(delay) {
    this.delay = delay;
  }

  initialize(callback) {
    setTimeout(() => callback(null, {data: 'SECRET'}), this.delay);
  }

  renew(callback) {}
}

class NeverInitializeProvider {
  initialize(callback) {}

  renew(callback) {}
}

describe('StorageService', function() {

  describe('StorageService#constructor', function () {
    it('should have a default LeaseManager', function () {
      const secret = '/TokenProvider/default/default';
      const storage = new StorageService();

      should(storage._managers.size).eql(1);
      should(storage._managers.has(secret)).be.exactly(true);
    });
  });

  describe('StorageService#lookup', function () {
    it('should lookup the secret from a ready LeaseManager', function (done) {
      const secret = 'test';
      const provider = new ImmediateInitializeProvider();
      const manager = new LeaseManager(provider);
      const storage = new StorageService();

      manager.initialize();
      storage._managers.set(secret, manager);

      storage.lookup('default', secret, ImmediateInitializeProvider, function(err, data) {
        should(err).eql(null);
        should(data).eql('SECRET');
        done();
      });
    });

    it('should lookup secret if LeaseManager becomes ready before timeout', function (done) {
      const secret = 'test';
      const provider = new DelayedInitializeProvider(1000);
      const manager = new LeaseManager(provider);
      const storage = new StorageService({timeout: 2000});

      storage._managers.set(secret, manager);

      storage.lookup('default', secret, DelayedInitializeProvider, function(err, data) {
        should(err).eql(null);
        should(data).eql('SECRET');
        done();
      });

      manager.initialize();
    });

    it('should timeout lookup calls if LeaseManager is not ready', function (done) {
      const timeout = 500;
      const storage = new StorageService({timeout});

      storage.lookup('default', 'secret', NeverInitializeProvider, function (err, data) {
        should(err).be.an.Error();
        should(err.message).eql('timeout: \'ready\' event');
        should(data).eql(null);
        done();
      });
    });

    it('should call the same callback multiple times if provided more than once when manager is ready', function (done) {
      const secret = 'test';
      const provider = new ImmediateInitializeProvider();
      const manager = new LeaseManager(provider);
      const storage = new StorageService();

      let numTimesToBeCalled = 2;
      const callback = (err, data) => {
        should(err).eql(null);
        should(data).eql('SECRET');

        numTimesToBeCalled--;
        if (numTimesToBeCalled == 0) {
          done();
        }
      };

      manager.initialize();
      storage._managers.set(secret, manager);

      storage.lookup('default', secret, ImmediateInitializeProvider, callback);
      storage.lookup('default', secret, ImmediateInitializeProvider, callback);
    });

    it('should call the same callback multiple times if provided more than once when manager becomes ready', function (done) {
      const secret = 'test';
      const provider = new DelayedInitializeProvider(1000);
      const manager = new LeaseManager(provider);
      const storage = new StorageService({timeout: 2000});

      let numTimesToBeCalled = 2;
      const callback = (err, data) => {
        should(err).eql(null);
        should(data).eql('SECRET');

        numTimesToBeCalled--;
        if (numTimesToBeCalled == 0) {
          done();
        }
      };

      storage._managers.set(secret, manager);

      storage.lookup('default', secret, DelayedInitializeProvider, callback);
      storage.lookup('default', secret, DelayedInitializeProvider, callback);

      manager.initialize();
    });

    it('should provide the default token to the Provider being retrieved if the token is available', function(done) {
      const l = new LeaseManager(new MockTokenProvider());
      const storage = new StorageService();

      l.initialize();
      storage._managers.set('/TokenProvider/default/default', l);
      storage.defaultToken = l;

      storage.lookup('default', 'somesecret', MockSecretProvider, (err, data) => {
        const lm = storage._managers.get('/MockSecretProvider/default/somesecret');

        lm.provider.token.should.eql('this-is-a-unique-token');
        done();
      });
    });

    it('should initialize the provider with a blank string if the requested token is not ready', function (done) {
      const storage = new StorageService();

      storage.lookup('default', 'somesecret', MockSecretProvider, (err, data) => {
        const lm = storage._managers.get('/MockSecretProvider/default/somesecret');

        lm.provider.token.should.eql('');
        done();
      });
    });
  });
});
