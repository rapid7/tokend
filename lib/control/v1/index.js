'use strict';

const Handlers = require('../util').Handlers;
const Err = require('../util').Err;
const VerifyHeaders = require('../util').VerifyHeaders;

exports.attach = function(app, storage) {
  app.get('/v1/health', require('./health')(storage));
  app.get('/v1/token/default', require('./token')(storage));

  // Backend endpoints
  app.get('/v1/secret/:token/:path(*)', require('./secret')(storage));
  app.get('/v1/cubbyhole/:token/:path(*)', require('./cubbyhole')(storage));
  app.get('/v1/credential/:token/:mount/:role', require('./credential')(storage));

  app.post('/v1/transit/:token/decrypt', require('./transit')(storage));
  app.use('/v1/transit', Handlers.allowed('POST'));

  app.use(Handlers.allowed('GET'));
  app.use(Err);
};
