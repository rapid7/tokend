'use strict';

function Token(app, storage) {
  app.get('/default', (req, res) => {
    storage.lookup('/v1/token/default', (err, result) => {
      res.json({
        token: 'TOKEN'
      })
    });
  });
}

module.exports = Token;
