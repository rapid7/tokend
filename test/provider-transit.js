'use strict';

require('./init');

const TransitProvider = require('../lib/providers/transit');
const preconditions = require('conditional');
const should = require('should');

describe('Provider/Transit', function () {
  describe('TransitProvider#constructor', function () {
    it('requires key be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider(value, 'TOKEN', {ciphertext: 'CTEXT'});
        }, preconditions.IllegalValueError, `invalid "key" argument: ${value}`);
      });
    });

    it('requires token be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider('KEY', value, {ciphertext: 'CTEXT'});
        }, preconditions.IllegalValueError, `invalid "token" argument: ${value}`);
      });
    });

    it('requires parameters be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider('KEY', 'TOKEN', value);
        }, preconditions.IllegalValueError, `invalid "parameters" argument: ${value}`);
      });
    });

    it('requires parameters.ciphertext be provided', function () {
      [null, undefined, ''].forEach(function (value) {
        should.throws(() => {
          return new TransitProvider('KEY', 'TOKEN', {ciphertext: value});
        }, preconditions.IllegalValueError, `invalid "parameters.ciphertext" argument: ${value}`);
      });
    });
  });
});
