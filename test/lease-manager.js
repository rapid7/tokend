'use strict';

const should = require('should');

const LeaseManager = require('../lib/lease-manager');

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
    should(new LeaseManager().status).eql('PENDING');
  });

  it('has default data that is null', function () {
    should(new LeaseManager().data).be.null();
  });

  it('changes status to READY when the provider immediately succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(0));

    manager.initialize();
    return Promise.resolve(manager.status).should.eventually.eql('READY');
  });

  it('changes data to a secret when the provider immediately succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(0));

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

  it('emits ready event when the provider succeeds', function (done) {
    const manager = new LeaseManager(new CountingInitializeProvider(2));

    manager.on('ready', function () {
      should(manager.data).eql('SECRET');
      done();
    });

    manager.initialize();
  });
});
