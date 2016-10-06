'use strict';

require('./init');

const should = require('should');
const sinon = require('sinon');
const LeaseManager = require('../lib/lease-manager');
const StorageService = require('../lib/storage-service');
const TokenProvider = require('../lib/providers/token');
const TransitProvider = require('../lib/providers/transit');

/**
 * A mock SecretProvider that fails to initialize N times before succeeding
 *
 */
class ImmediateInitializeProvider {

  initialize() {
    return Promise.resolve({data: 'SECRET'});
  }

  renew() {
    return Promise.resolve({data: 'SECRET'});
  }
}

class MockTokenProvider {
  constructor() {
    this.data = {
      lease_id: 'token',
      lease_duration: 60,
      data: {
        token: 'this-is-a-unique-token'
      }
    };
  }

  initialize() {
    return Promise.resolve(this.data);
  }

  renew() {
    return Promise.resolve(this.data);
  }
}

class DelayedMockTokenProvider {
  constructor() {
    this.data = {
      lease_id: 'token',
      lease_duration: 60,
      data: {
        token: 'this-is-a-unique-token'
      }
    };
  }

  initialize() {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.data), 1000);
    });
  }
}

class MockSecretProvider {
  constructor(secret, token) {
    this.token = token;
    this.secret = secret;
  }

  initialize() {
    return Promise.resolve({
      lease_id: 'token',
      lease_duration: 60,
      data: {
        somesecret: 'SUPERSECRET'
      }
    });
  }
}

class MockTransitProvider {
  initialize() {
    return Promise.resolve({
      data: {
        plaintext: 'PTEXT'
      }
    });
  }
}
MockTransitProvider.getSecretID = TransitProvider.getSecretID;

class DelayedInitializeProvider {

  constructor(delay) {
    this.delay = delay;
  }

  initialize() {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve({data: 'SECRET'}), this.delay);
    });

  }

  renew() {
    return Promise.resolve({data: 'SECRET'});
  }
}

class NeverInitializeProvider {
  initialize() {
    return Promise.reject(false);
  }

  renew() {}
}

class NonRenewingProvider {
  initialize() {
    return Promise.resolve({
      renewable: false,
      data: {plaintext: 'PTEXT'}
    });
  }

  renew() {
    return Promise.resolve({
      renewable: false,
      data: {plaintext: 'PTEXT'}
    });
  }
}
NonRenewingProvider.getSecretID = TransitProvider.getSecretID;

class DelayedNonRenewingProvider {
  constructor(delay) {
    this.delay = delay;
  }

  initialize() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({
          renewable: false,
          data: {plaintext: 'PTEXT'}
        });
      }, this.delay);
    });
  }

  renew() {
    return Promise.resolve({
      renewable: false,
      data: {plaintext: 'PTEXT'}
    });
  }
}
DelayedNonRenewingProvider.getSecretID = TransitProvider.getSecretID;

function setTokenProvider(storage, provider) {
  if (!provider) {
    provider = new MockTokenProvider();
  }
  const l = new LeaseManager(provider);

  storage._managers.set('/TokenProvider/default/default', l);
  storage.defaultToken = l;
  return storage;
}

describe('StorageService', function() {

  describe('StorageService#constructor', function () {
    it('should have a default LeaseManager', function () {
      const storage = new StorageService();
      const t = storage.defaultToken;

      should(t).be.a.instanceOf(LeaseManager);
      should(t.provider).be.a.instanceOf(TokenProvider);
      should(storage._managers.size).eql(1);
      should(storage._managers.has('/TokenProvider/default/default')).be.exactly(true);
    });
  });

  describe('StorageService#lookup', function () {
    it('should lookup the secret from a ready LeaseManager', function () {
      const manager = new LeaseManager(new ImmediateInitializeProvider());
      const storage = setTokenProvider(new StorageService());

      storage._managers.set('/ImmediateInitializeProvider/default/test', manager);
      return manager.initialize().then(() => {
        return storage.lookup('default', 'test', ImmediateInitializeProvider).then((data) => {
          should(data).eql('SECRET');
        });
      });
    });

    it('should lookup secret if LeaseManager becomes ready before timeout', function () {
      const secret = 'test';
      const provider = new DelayedInitializeProvider(1000);
      const manager = new LeaseManager(provider);
      const storage = setTokenProvider(new StorageService({timeout: 2000}));

      return manager.initialize().then(() => {
        storage._managers.set(secret, manager);

        storage.lookup('default', secret, DelayedInitializeProvider).then((data) => {
          should(data).eql('SECRET');
        });
      });
    });

    it('should timeout lookup calls if LeaseManager is not ready', function () {
      const storage = setTokenProvider(new StorageService({timeout: 500}));

      return storage.lookup('default', 'secret', NeverInitializeProvider).catch((err) => {
        should(err).be.an.Error();
        should(err.message).eql('timeout: \'ready\' event');
      });
    });

    it('should call the same callback multiple times if provided more than once when manager is ready', function (done) {
      const secret = 'test';
      const provider = new ImmediateInitializeProvider();
      const manager = new LeaseManager(provider);
      const storage = setTokenProvider(new StorageService());

      let numTimesToBeCalled = 2;
      const callback = (data) => {
        should(data).eql('SECRET');

        numTimesToBeCalled--;
        if (numTimesToBeCalled == 0) {
          done();
        }
      };

      manager.initialize().then(() => {
        storage._managers.set(secret, manager);

        storage.lookup('default', secret, ImmediateInitializeProvider).then(callback);
        storage.lookup('default', secret, ImmediateInitializeProvider).then(callback);
      });
    });

    it('should call the same callback multiple times if provided more than once when manager becomes ready', function (done) {
      const secret = 'test';
      const storage = setTokenProvider(new StorageService({timeout: 2000}));

      let numTimesToBeCalled = 2;
      const callback = (data) => {
        should(data).eql('SECRET');

        numTimesToBeCalled--;
        if (numTimesToBeCalled == 0) {
          done();
        }
      };

      storage.lookup('default', secret, DelayedInitializeProvider).then(callback);
      storage.lookup('default', secret, DelayedInitializeProvider).then(callback);
    });

    it('should provide the default token to the Provider being retrieved if the token is available', function() {
      const storage = setTokenProvider(new StorageService());

      storage.lookup('default', 'somesecret', MockSecretProvider).then((data) => {
        const lm = storage._managers.get('/MockSecretProvider/default/somesecret');

        lm.provider.token.should.eql('this-is-a-unique-token');
      });
    });

    it('should wait until the requested token is ready before initialize the provider', function () {
      const storage = setTokenProvider(new StorageService());

      return storage.lookup('default', 'somesecret', MockSecretProvider).then(() => {
        const lm = storage._managers.get('/MockSecretProvider/default/somesecret');

        lm.provider.token.should.not.eql('');
      });
    });

    it('should only provision one TokenProvider', function () {
      const spy = sinon.spy(DelayedMockTokenProvider.prototype, 'initialize');
      const storage = setTokenProvider(new StorageService(), new DelayedMockTokenProvider());

      return storage.lookup('default', 'somesecret', MockSecretProvider).then(() => spy.calledOnce.should.be.true);

    });

    it('should remove a Provider from StorageService#_mangers if it raises an error', function () {
      const storage = setTokenProvider(new StorageService());

      return storage.lookup('default', 'somesecret', NeverInitializeProvider).catch(() => {
        storage._managers.size.should.equal(1);
        storage._managers.has('/NeverInitializeProvider/default/somesecret').should.be.false();
      });
    });

    it('should support Providers using Object secrets', function () {
      const storage = setTokenProvider(new StorageService());

      return storage.lookup('default', {key: 'KEY', ciphertext: 'CTEXT'}, MockTransitProvider)
      .then((result) => {
        storage._managers.size.should.equal(2);

        result.should.eql({plaintext: 'PTEXT'});
      });
    });

    it('should reuse managers for similar Object secrets', function () {
      const storage = setTokenProvider(new StorageService());

      const secret1 = storage.lookup('default', {ciphertext: 'CTEXT', key: 'KEY'}, MockTransitProvider);
      const secret2 = storage.lookup('default', {key: 'KEY', ciphertext: 'CTEXT'}, MockTransitProvider);

      return Promise.all([secret1, secret2]).then((results) => {
        storage._managers.size.should.equal(2);

        results.forEach((result) => {
          result.should.eql({plaintext: 'PTEXT'});
        });
      });
    });

    it('should not reuse managers for unique Object secrets', function () {
      const storage = setTokenProvider(new StorageService());

      const secret1 = storage.lookup('default', {key: 'KEY1', ciphertext: 'CTEXT'}, MockTransitProvider);
      const secret2 = storage.lookup('default', {key: 'KEY2', ciphertext: 'CTEXT'}, MockTransitProvider);

      return Promise.all([secret1, secret2]).then((results) => {
        storage._managers.size.should.equal(3);

        results.forEach((result) => {
          result.should.eql({plaintext: 'PTEXT'});
        });
      });
    });

    it('should not cache managers for non-renewable secrets that are immediate', function () {
      const storage = setTokenProvider(new StorageService());

      return storage.lookup('default', {key: 'KEY', ciphertext: 'CTEXT'}, NonRenewingProvider)
      .then((result) => {
        storage._managers.size.should.equal(1);
        result.should.eql({plaintext: 'PTEXT'});
      });
    });

    it('should not cache managers for non-renewable secrets that are delayed', function () {
      const storage = setTokenProvider(new StorageService(), new DelayedNonRenewingProvider(1000));

      return storage.lookup('default', {key: 'KEY', ciphertext: 'CTEXT'}, DelayedNonRenewingProvider)
      .then((result) => {
        storage._managers.size.should.equal(1);
        result.should.eql({plaintext: 'PTEXT'});
      });
    });
  });
});
