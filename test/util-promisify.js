/* eslint-env mocha */
'use strict';

const chai = require('chai');
const should = require('should');
const promisify = require('../lib/utils/promisify');

chai.use(require('chai-as-promised'));

const fail = (callback) => {
  throw new Error('asdf');
};

const pass = (callback) => {
  return {
    foo: 'bar',
    baz: true
  };
};

describe('Util/Promisify', () => {
  it('should wrap the method in a promise', () => {
    promisify((done) => pass(done)).should.be.a.Promise();
  });

  it('should reject with an error if the promise-ified method returns one', () => {
    promisify((c) => fail(c)).catch((err) => {
      expect(err).to.be.Error();
    })
  });

  it('should pass and return data if the promise-ified method returns a result', () => {
    promisify((done) => pass(done)).should.eventually.eql({
      foo: 'bar',
      baz: true
    });
  });
});
