'use strict';

const chai = require('chai');
const should = require('should');
const promisify = require('../lib/utils/promisify');

chai.use(require('chai-as-promised'));

const fail = (callback) => {
  callback(Error('Some error message'), null);
};

const pass = (callback) => {
  callback(null, {
    foo: 'bar',
    baz: true
  });
};

describe('Util/Promisify', function() {
  it('should wrap the method in a promise', function() {
    promisify((c) => pass(c)).should.be.a.Promise();
  });

  it('should reject with an error if the promise-ified method returns one', function() {
    return promisify((c) => fail(c)).should.be.rejectedWith(Error, {message: 'Some error message'});
  });

  it('should pass and return data if the promise-ified method returns a result', function() {
    return promisify((c) => pass(c)).should.eventually.eql({
      foo: 'bar',
      baz: true
    });
  });
});
