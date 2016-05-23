'use strict';

const ROUTES = [
  'health',
  'secret',
  'token'
];

exports.attach = function (app, storage) {
  ROUTES.forEach((route) => require(`./${route}`)(app, storage));
};
