'use strict';

const should = require('should');

const LeaseManager = require('../lib/lease-manager');

describe('LeaseManager#constructor', function () {
  it('has a default status of PENDING', function () {
    should(new LeaseManager().status).eql('PENDING');
  });

  it('has default data that is null', function () {
    should(new LeaseManager().data).be.null();
  });
});
