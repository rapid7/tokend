'use strict';

const should = require('should');

const LeaseManager = require('../lib/lease-manager');
const StorageService = require('../lib/storage-service');
const SecretProvider = require('../lib/providers/secret');

/**
 * A mock SecretProvider that fails to initialize N times before succeeding
 *
 */
class ImmediateInitializeProvider {

  initialize(callback) {
    callback(null, {data: 'SECRET'});
  }
}

class DelayedInitializeProvider {

  constructor(delay) {
    this.delay = delay;
  }

  initialize(callback) {
    setTimeout(() => callback(null, {data: 'SECRET'}), this.delay);
  }
}

class MockTokenProvider {
  initialize(callback){
    callback(null, {
      data: {
        token: 'some-token'
      }
    });
  }

  renew(callback) {
    callback(null, {data: 'SECRET'})
  }
}

describe('StorageService', function() {

  describe('StorageService#constructor', function () {
    it('should have a default LeaseManager', function () {
      const secret = '/v1/token/default';
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

      storage.lookup(secret, function(err, data) {
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

      storage.lookup(secret, function(err, data) {
        should(err).eql(null);
        should(data).eql('SECRET');
        done();
      });

      manager.initialize();
    });

    it('should timeout lookup calls if LeaseManager is not ready', function (done) {
      const timeout = 5;
      const storage = new StorageService({timeout});

      storage.lookup('secret', function(err, data) {
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

      storage.lookup(secret, callback);
      storage.lookup(secret, callback);
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

      storage.lookup(secret, callback);
      storage.lookup(secret, callback);

      manager.initialize();
    });

    it('should instantiate the correct provider type based on the requested secret', function (done) {
      const secret = '/v1/secret/default/secret/acoolsecret';
      const manager = new LeaseManager(new MockTokenProvider());
      const storage = new StorageService();

      manager.initialize();
      manager.status = 'READY';
      storage._managers.set('/v1/token/default', manager);

      storage.lookup(secret, (err, data) => {
        const secretManager = storage._managers.get(secret);

        secretManager.status = 'READY';
        secretManager.provider.should.be.instanceof(SecretProvider);
        done();
      });
    });

    it('should throw an error if an unsupported secret mount is requested', function (done) {
      const secret = '/v1/secret/default/notarealmountpoint/acoolsecret';
      const provider = new MockTokenProvider();
      const manager = new LeaseManager(provider);
      const storage = new StorageService();

      manager.initialize();
      manager.status = 'READY';
      storage._managers.set('/v1/token/default', manager);

      should.throws(() => {
        storage.lookup(secret, (err, data) => {});
      }, Error, 'Unsupported secret backend');
      done();
    });
  });
});
