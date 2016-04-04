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

describe('LeaseManager#constructor', function () {
  it('has a default status of PENDING', function () {
    should(new LeaseManager(new DoNothingProvider()).status).eql('PENDING');
  });

  it('has default data that is null', function () {
    should(new LeaseManager(new DoNothingProvider()).data).be.null();
  });

  it('changes status to READY when the provider succeeds', function () {
    should(new LeaseManager(new InitializeSucceedProvider()).status).eql('READY');
  });

  it('changes data to a secret when the provider succeeds', function () {
    should(new LeaseManager(new InitializeSucceedProvider()).data).eql('SECRET');
  });
});
