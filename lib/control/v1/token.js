'use strict';

function Token(app, storage) {
  app.get('/default', (req, res) => {
    storage.lookup('/v1/token/default', (err, result) => {
      const response = (err) ? {error: err.message} : {token: result};

      res.json(response);
    });
  });
}

module.exports = Token;
