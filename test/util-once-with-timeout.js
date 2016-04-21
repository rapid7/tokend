/* eslint max-nested-callbacks:0 */
'use strict';

const should = require('should');
const chai = require('chai');
const expect = chai.expect;

const EventEmitter = require('events').EventEmitter;
const onceWithTimeout = require('../lib/utils/once-with-timeout');

/**
 * A mock EventEmitter that will fire an event after an N millisecond delay.
 *
 */
class DelayedEventEmitter extends EventEmitter {

  constructor(delay) {
    super();

    this.delay = delay;
    this.initialized = false;
  }

  initialize() {
    setTimeout(() => {
      this.initialized = true;
      this.emit('ready')
    }, this.delay);
  }
}

describe('Util/onceWithTimeout', function() {

  it('requires valid arguments', function() {
    const emitter = new DelayedEventEmitter(0);

    expect(() => onceWithTimeout()).to.throw(Error);
    expect(() => onceWithTimeout(null)).to.throw(Error);
    expect(() => onceWithTimeout({})).to.throw(Error);
    expect(() => onceWithTimeout(1)).to.throw(Error);
    expect(() => onceWithTimeout(emitter)).to.throw(Error);
    expect(() => onceWithTimeout(emitter, null)).to.throw(Error);
    expect(() => onceWithTimeout(emitter, 'ready')).to.not.throw(Error);
    expect(() => onceWithTimeout(emitter, 'ready', 0)).to.not.throw(Error);
    expect(() => onceWithTimeout(emitter, 'ready', 'test')).to.not.throw(Error);
    expect(() => onceWithTimeout(emitter, 'ready', Infinity)).to.not.throw(Error);
  });

  it('allows event to fire if timeout is not specified or 0', function() {
    const delay = 500;
    const emitter = new DelayedEventEmitter(delay);

    const promise1 = onceWithTimeout(emitter, 'ready')
      .then(() => {
        should(emitter.initialized).eql(true)
      });

    const promise2 = onceWithTimeout(emitter, 'ready', 0)
      .then(() => {
        should(emitter.initialized).eql(true)
      });

    emitter.initialize();

    return Promise.all([promise1, promise2]);
  });

  it('should allow events to fire if not timed out', function() {
    const delay = 500;
    const emitter = new DelayedEventEmitter(delay);

    const promise = onceWithTimeout(emitter, 'ready', 2 * delay)
      .then(() => {
        should(emitter.initialized).eql(true)
      });

    emitter.initialize();

    return promise;
  });

  it('should timeout an event', function() {
    const delay = 500;
    const emitter = new DelayedEventEmitter(delay);

    const promise = onceWithTimeout(emitter, 'ready', delay / 2)
      .catch((err) => {
        should(err).be.an.Error();
        should(emitter.initialized).eql(false);
      });

    emitter.initialize();

    return promise;
  });

  it('handles multiple calls from same emitter independently', function() {
    const delay = 500;
    const emitter = new DelayedEventEmitter(delay);

    const promise1 = onceWithTimeout(emitter, 'ready', delay / 2)
      .catch((err) => {
        should(err).be.an.Error();
        should(emitter.initialized).eql(false);
      });

    const promise2 = onceWithTimeout(emitter, 'ready', 2 * delay)
      .then(() => {
        should(emitter.initialized).eql(true)
      });

    emitter.initialize();

    return Promise.all([promise1, promise2]);
  });
});
