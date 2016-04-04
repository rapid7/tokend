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

describe('LeaseManager#constructor', function () {
  it('has a default status of PENDING', function () {
    should(new LeaseManager(new DoNothingProvider()).status).eql('PENDING');
  });

  it('has default data that is null', function () {
    should(new LeaseManager(new DoNothingProvider()).data).be.null();
  });
});
