'use strict';

const express = require('express');
const Handlers = require('../util').Handlers;

exports.attach = function (app, storage) {
  app.get('/v1/health', require('./health'));
  app.get('/v1/token/default', require('./token')(storage));

  // Backend endpoints
  app.get('/v1/secret/:token/:path(*)', require('./secret')(storage));
  app.get('/v1/cubbyhole/:token/:path', require('./cubbyhole')(storage));
  app.get('/v1/credential/:token/:mount/:role', require('./credential')(storage));

  app.use(Handlers.allowed('GET'));
};
