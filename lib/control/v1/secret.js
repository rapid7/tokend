'use strict';

function Secret(app, storage) {
  app.get('/default/:mount/:role', (req, res) => {
    const mount = req.params.mount;
    const role = req.params.role;

    storage.lookup(`/v1/secret/default/${mount}/${role}`, (err, result) => {
      res.json({
        username: 'USERNAME',
        password: 'PASSWORD'
      });
    });
  });
}

module.exports = Secret;
