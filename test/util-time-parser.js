'use strict';

const chai = require('chai');
const should = require('should');
const time = require('../lib/utils/time-parser');

describe('Util/Time Parser', function() {
  it('parses a number without time unit', function() {
    time.parse('10').should.equal(10);
  });

  it('parses a number with nanoseconds as the time unit', function() {
    time.parse('5000000000ns').should.equal(5);
  });

  it('parses a number with microseconds as the time unit', function() {
    time.parse('5000000µs').should.equal(5);
    time.parse('5000000us').should.equal(5);
  });

  it('parses a number with milliseconds as the time unit', function() {
    time.parse('5000ms').should.equal(5);
  });

  it('parses a number with seconds as the time unit', function() {
    time.parse('50s').should.equal(50);
  });

  it('parses a number with minutes as the time unit', function() {
    time.parse('3m').should.equal(180);
  });

  it('parses a number with hours as the time unit', function() {
    time.parse('768h').should.equal(2764800);
  });

  it('parses a number with days as the time unit', function() {
    time.parse('3d').should.equal(259200);
  });

  it('returns 0 if passed null or undefined', function() {
    time.parse(null).should.equal(0);
    time.parse(undefined).should.equal(0);
  });
  it('returns 0 if passed an empty string', function() {
    time.parse('').should.equal(0);
  });

  it('returns 0 if passed a negative number', function() {
    time.parse('-5s').should.equal(0);
  });

  it('can parse a number with commas in it', function() {
    time.parse('5,000,000µs').should.equal(5);
  });

  it('throws an error if it does not recognize the time unit', function() {
    should.throws(() => {
      time.parse('20foo');
    }, Error, 'Unknown unit foo');
  });

  it('parses a fractional time unit', function() {
    time.parse('3.5h').should.equal(12600);
  });
});
