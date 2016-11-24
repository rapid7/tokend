/* global Config */
'use strict';

const should = require('should');
const Provider = require('../lib/providers/provider');
const Interface = require('../lib/utils/interface');
const ImplementationError = require('../lib/errors').ImplementationError;

class TestProvider extends Provider {
  constructor() {
    super();
  }
}

describe('Provider/Interface', function() {
  beforeEach(function() {
    delete TestProvider.prototype.renew;
    delete TestProvider.prototype.invalidate;
    delete TestProvider.prototype.initialize;
  });

  it('should throw if #initialize is not implemented', function(done) {
    TestProvider.prototype.renew = function() {};
    TestProvider.prototype.invalidate = function() {};
    const p = new TestProvider();

    try {
      p.initialize();
    } catch (e) {
      should(e).be.instanceof(ImplementationError);
      done();
    }
  });

  it('should throw if #renew is not implemented', function(done) {
    TestProvider.prototype.initialize = function() {};
    TestProvider.prototype.invalidate = function() {};
    const p = new TestProvider();

    try {
      p.renew();
    } catch (e) {
      should(e).be.instanceof(ImplementationError);
      done();
    }
  });

  it('should throw if #invalidate is not implemented', function(done) {
    TestProvider.prototype.initialize = function() {};
    TestProvider.prototype.renew = function() {};
    const p = new TestProvider();

    try {
      p.invalidate();
    } catch (e) {
      should(e).be.instanceof(ImplementationError);
      done();
    }
  });

  it('should throw if instantiated directly', function() {
    should.throws(() => new Provider(), TypeError, 'Provider is an abstract class and cannot be instantiated directly');
  });
});
