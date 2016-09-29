'use strict';

require('./init');

const TransitProvider = require('../lib/providers/transit');
const preconditions = require('conditional');
const should = require('should');

describe('Provider/Transit', function () {
  describe('TransitProvider#constructor', function () {
    it('throws an IllegalValueError if the key is not provided', function () {
      should.throws(() => {
        return new TransitProvider('', 'TOKEN', {ciphertext: 'CTEXT'});
      }, preconditions.IllegalValueError);
    });
  });
});
