'use strict';

const express = require('express');
const BodyParser  = require('body-parser');
const Handlers = require('../util').Handlers;
const Err = require('../util').Err;

exports.attach = function (app, storage) {
  app.get('/v1/health', require('./health'));
  app.use('/v1/health', Handlers.allowed('GET'));
  app.get('/v1/token/default', require('./token')(storage));
  app.use('/v1/token', Handlers.allowed('GET'));

  // Backend endpoints
  app.get('/v1/secret/:token/:path(*)', require('./secret')(storage));
  app.use('/v1/secret', Handlers.allowed('GET'));
  app.get('/v1/cubbyhole/:token/:path', require('./cubbyhole')(storage));
  app.use('/v1/cubbyhole', Handlers.allowed('GET'));
  app.get('/v1/credential/:token/:mount/:role', require('./credential')(storage));
  app.use('/v1/credential', Handlers.allowed('GET'));

  app.use(BodyParser.json());

  app.post('/v1/transit/:token/decrypt', require('./transit')(storage));
  app.use('/v1/transit', Handlers.allowed('POST'));

  app.use(Err);
};
