'use strict';

const SecretProvider = require('../lib/providers/secret');

describe('Provider/Secret', function() {
  it('sets the correct path prefix', function() {
    const s = new SecretProvider('foo', 'bar');

    s.path.should.startWith('secret');
    Object.getPrototypeOf(s.constructor).name.should.equal('GenericProvider');
  });
});
