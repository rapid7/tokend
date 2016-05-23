'use strict';

function Secret(app, storage) {
  app.get('/v1/secret/default/:mount/:role', (req, res) => {

  });
}

module.exports = Secret;
