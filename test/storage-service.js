/* eslint max-nested-callbacks:0 */
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

      storage._managers.set(secret, manager);

      storage.lookup(secret, function(err, data) {
        should(err).eql(null);
        should(data).eql('SECRET');
        done();
      });

      manager.initialize();
    });

    it('should timeout lookup calls if LeaseManager is not ready', function (done) {
      const timeout = 500;
      const storage = new StorageService({timeout});

      storage.lookup('secret', function(err, data) {
        should(err).be.an.Error();
        should(err.message).eql('timeout: \'ready\' event');
        should(data).eql(null);
        done();
      });
    });
  });
});
