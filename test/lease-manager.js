'use strict';

const should = require('should');

const LeaseManager = require('../lib/lease-manager');

/* eslint-disable no-inline-comments */

/**
 * A mock SecretProvider that fails to initialize
 */
class FailToInitializeProvider {
  initialize() {
    return Promise.reject(new Error('Failed to initialize.'));
  }
}

/**
 * A mock SecretProvider that fails to renew
 */
class FailToRenewProvider {
  initialize() {
    return Promise.resolve({
      data: 'SECRET',
      lease_duration: 1
    })
  }
  renew() {
    return Promise.reject(new Error('Failed to renew.'));
  }
}

/**
 * A mock SecretProvider that fails to initialize N times before succeeding
 */
class CountingInitializeProvider {

  constructor(count) {
    this.count = count;
  }

  initialize() {
    return new Promise((resolve, reject) => {
      if (this.count > 1) {
        this.count -= 1;
        reject(new Error(`Need ${this.count} more calls to initialize`));
      }
      else {
        resolve({
          data: 'SECRET',
          lease_duration: 1
        });
      }
    });
  }

  renew() {
    return Promise.resolve(true);
  }
}

/**
 * A mock SecretProvider that fails to renew N times before succeeding
 */
class CountingRenewProvider {

  constructor(count) {
    this.count = count;
  }

  initialize() {
    return Promise.resolve({
      data: 'SECRET',
      lease_duration: 1
    });
  }

  renew() {
    return new Promise((resolve, reject) => {
      if (this.count > 1) {
        this.count -= 1;
        reject(new Error(`Need ${this.count} more calls to renew`));
      }
      else {
        resolve({
          lease_duration: 2
        });
      }
    });
  }
}

class ChangingTimeoutProvider {
  constructor() {
    this.renewed = false;
  }

  initialize() {
    return Promise.resolve({
      data: 'SECRET',
      lease_duration: 1
    });
  }

  renew() {
    if (this.renewed) {
      return Promise.resolve({
        data: 'SECRET',
        lease_duration: 1
      });
    }
    this.renewed = true;
    return Promise.resolve({
      data: 'SECRET',
      lease_duration: 2
    });
  }
}

class NonRenewableProvider {
  initialize() {
    return Promise.resolve({
      data: 'SECRET',
      renewable: false,
      lease_duration: 1
    });
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

  it('has a default renewable flag that is false', function () {
    should(new LeaseManager().renewable).be.false();
  });
});

describe('LeaseManager#initialize', function () {
  it('changes status to READY when the provider immediately succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(0));

    return manager.initialize().then(() => {
      manager.status.should.eql('READY');
    });
  });

  it('changes data to a secret when the provider immediately succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(0));

    return manager.initialize().then(() => {
      manager.data.should.eql('SECRET');
    });
  });

  it('changes lease duration to non-zero when the provider immediately succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(0));

    return manager.initialize().then(() => {
      manager.lease_duration.should.eql(1);
    });
  });

  it('changes renewable flag to true if the provider can be renewed', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(0));

    should(manager.renewable).be.true();
  });

  it('change status to ready when the provider eventually succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(2));

    return manager.initialize().catch(() => manager.initialize().then(() => {
      manager.status.should.eql('READY');
    }));
  });

  it('change data to a secret when the provider eventually succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(2));

    return manager.initialize().catch(() => manager.initialize().then(() => {
      manager.data.should.eql('SECRET');
    }));
  });

  it('change lease duration to non-zero when the provider eventually succeeds', function () {
    const manager = new LeaseManager(new CountingInitializeProvider(2));

    return manager.initialize().catch(() => manager.initialize().then(() => {
      manager.lease_duration.should.eql(1);
    }));
  });

  it('emits ready event when the provider succeeds', function (done) {
    const manager = new LeaseManager(new CountingInitializeProvider(2));

    manager.on('ready', function () {
      should(manager.data).eql('SECRET');
      done();
    });

    manager.initialize().catch(() => manager.initialize());
  });

  it('should clear the provider data and lease_duration if the provider fails to initialize', function () {
    const manager = new LeaseManager(new FailToInitializeProvider());

    return manager.initialize().catch(() => {
      should(manager.data).be.null();
      manager.lease_duration.should.equal(0);
    });
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
    const manager = new LeaseManager(new CountingRenewProvider(2));

    manager.once('renewed', () => {
      should(manager.lease_duration).eql(2);
      done();
    });

    manager.initialize();
  });

  it('should change the #_timer if the token/secret timeout has changed', function (done) {
    const manager = new LeaseManager(new ChangingTimeoutProvider());
    let timer = null,
        renewal = false;

    manager.on('renewed', () => {
      if (!renewal) {
        timer = manager._timer;
        timer._idleTimeout.should.equal(500); // 1 second / 2
        renewal = true;
      } else {
        manager._timer.should.not.equal(timer);
        manager._timer._idleTimeout.should.equal(1000); // 2 seconds / 2
        done();
      }
    });

    manager.initialize().then(() => {
      manager.initialize();
    })
  });

  it('shouldn\'t clear the provider data when renewal fails', function (done) {
    const manager = new LeaseManager(new FailToRenewProvider());

    manager.once('error', () => {
      manager.data.should.not.be.null();
      manager.lease_duration.should.not.equal(0);
      done();
    });

    manager.initialize();
  });

  it('should not be called if the provider is not renewable', function () {
    const manager = new LeaseManager(new NonRenewableProvider());

    return manager.initialize().then(() => {
      should(manager.renewable).be.false();
      should(manager._timer).be.null();
      should(manager._timeout).be.null();
    });
  });
});
