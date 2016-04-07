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
      callback(null, {
        data: 'SECRET',
        lease_duration: 1
      });
    }
  }
}

/**
 * A mock SecretProvider that fails to renew N times before succeeding
 */
class CountingRenewProvider {

  constructor(count) {
    this.count = count;
  }

  initialize(callback) {
    callback(null, {
      data: 'SECRET',
      lease_duration: 1
    });
  }

  renew(callback) {
    if (this.count > 1) {
      this.count -= 1;
      callback(new Error(`Need ${this.count} more calls to renew`), null);
    }
    else {
      callback(null, {
        lease_duration: 2
      });
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

  it('has a default lease duration that is zero', function () {
    should(new LeaseManager().lease_duration).eql(0);
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

  it('changes lease duration to non-zero when the provider immediately succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(0));

    manager.initialize();
    return Promise.resolve(manager.lease_duration).should.eventually.eql(1);
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

  it('change lease duration to non-zero when the provider eventually succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(2));

    manager.initialize();
    return Promise.resolve(manager.lease_duration).should.eventually.eql(1);
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

describe('LeaseManager#_renew', function () {
  it('changes lease duration when the provider immediately renews', function (done) {
    const manager = new LeaseManager(new CountingRenewProvider(0));

    manager.once('renewed', () => {
      should(manager.lease_duration).eql(2);
      done();
    });

    manager.initialize();
  });

  it('changes lease duration when the provider eventually renews', function (done) {
    const manager = new LeaseManager(new CountingRenewProvider(0));

    manager.once('renewed', () => {
      should(manager.lease_duration).eql(2);
      done();
    });

    manager.initialize();
  });
});
