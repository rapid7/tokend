'use strict';

const SecretProvider = require('../lib/providers/secret');

describe('Provider/Secret', function() {
  it('sets the correct Vaulted method', function() {
    const s = new SecretProvider('foo', 'bar');

    s._method.should.equal('read');
    Object.getPrototypeOf(s.constructor).name.should.equal('GenericProvider');
  });
});
