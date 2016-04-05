'use strict';

const should = require('should');

const LeaseManager = require('../lib/lease-manager');

/**
 * A mock SecretProvider that does nothing on initialize or renew
 */
class DoNothingProvider {
  initialize() {
  }

  renew() {
  }
}

/**
 * A mock SecretProvider that succeeds on initialize
 */
class InitializeSucceedProvider {
  initialize(callback) {
    callback(null, 'SECRET');
  }
}

/**
 * A mock SecretProvider that fails to initialize N times before succeeding
 */
class CountingInitializeProvider {

  constructor(count) {
    this.count = count;
  }

  initialize(callback) {
    if (this.count > 1) {
      this.count -= 1;
      callback(new Error(`Need ${this.count} more calls to initialize`), null);
    }
    else {
      callback(null, 'SECRET');
    }
  }
}

describe('LeaseManager#constructor', function () {
  it('has a default status of PENDING', function () {
    should(new LeaseManager(new DoNothingProvider()).status).eql('PENDING');
  });

  it('has default data that is null', function () {
    should(new LeaseManager(new DoNothingProvider()).data).be.null();
  });

  it('changes status to READY when the provider succeeds', function () {
    const manager = new LeaseManager(new InitializeSucceedProvider());

    manager.initialize();
    return Promise.resolve(manager.status).should.eventually.eql('READY');
  });

  it('changes data to a secret when the provider succeeds', function () {
    const manager = new LeaseManager(new InitializeSucceedProvider());

    manager.initialize();
    return Promise.resolve(manager.data).should.eventually.eql('SECRET');
  });

  it('change status to ready when the provider eventually succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(2));

    manager.initialize();
    return Promise.resolve(manager.status).should.eventually.eql('READY');
  });

  it('change data to a secret when the provider eventually succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(2));

    manager.initialize();
    return Promise.resolve(manager.data).should.eventually.eql('SECRET');
  });
});
