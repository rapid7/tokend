'use strict';

const express = require('express');

const ROUTES = [
  'health',
  'secret',
  'token'
];

const HTTP_METHOD_NOT_ALLOWED = 405;

const methodNotAllowed = (req, res) => {
  res.set('Allow', 'GET');
  res.status(HTTP_METHOD_NOT_ALLOWED);
  res.end();
};

exports.attach = function (app, storage) {
  ROUTES.forEach((route) => {
    const router = express.Router();

    require(`./${route}`)(router, storage);
    router.use(methodNotAllowed);
    app.use(`/v1/${route}`, router);
  });
};
