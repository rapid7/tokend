/* global Config */
'use strict';

const CubbyHoleProvider = require('../lib/providers/cubbyhole');

describe('Provider/CubbyHole', function () {
  it('sets the correct Vaulted method', function () {
    const s = new CubbyHoleProvider('foo', 'bar');

    s._method.should.equal('readCubby');
    Object.getPrototypeOf(s.constructor).name.should.equal('GenericProvider');
  });
});
