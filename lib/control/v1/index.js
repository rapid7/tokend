'use strict';

const express = require('express');
const Handlers = require('../util').Handlers;

exports.attach = function (app, storage) {
  app.get('/v1/health', require('./health'));
  app.get('/v1/secret/default/:mount/:role', require('./secret')(storage));
  app.get('/v1/token/default', require('./token')(storage));

  app.use(Handlers.allowed('GET'));
};
