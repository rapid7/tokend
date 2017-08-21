'use strict';

const CubbyHoleProvider = require('../lib/providers/cubbyhole');

describe('Provider/CubbyHole', function() {
  it('sets the correct path prefix', function() {
    const s = new CubbyHoleProvider('foo', 'bar');

    s.path.should.startWith('cubbyhole');
    Object.getPrototypeOf(s.constructor).name.should.equal('GenericProvider');
  });
});
