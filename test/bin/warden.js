'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const Vaulted = require('vaulted');

const DEFAULT_PORT = 3000;
const VAULT_PORT = 8200;
const token = process.argv[2];

const app = express();
const router = express.Router();
const vault = new Vaulted({
  vault_host: '127.0.0.1',
  vault_port: VAULT_PORT,
  vault_ssl: false
});

app.use(bodyParser.json());
app.use(router);

vault.setToken(token).prepare();

router.param('id', (req, res, next, id) => {
  req.id = id;
  next();
});

router.route('/').post((req, res) => {
  vault.createToken({
    body: {
      ttl: '1m'
    }
  })
  .then((data) => {
    const resp = {
      lease_duration: data.auth.lease_duration,
      renewable: data.auth.renewable,
      data: {
        token: data.auth.client_token
      }
    };

    console.log(resp);
    res.json(resp);
  })
  .catch((err) => {
    console.log(err);
    res.status(err.statusCode)
        .json(err.error);
  });
});

router.route('/mounts').get((req, res) => {
  vault.getMounts()
    .then((mounts) => res.json(mounts))
    .catch((err) => res.status(err.statusCode).json(err.error));
});

router.route('/auths').get((req, res) => {
  vault.getAuthMounts()
    .then((authMounts) => res.json(authMounts))
    .catch((err) => res.status(err.statusCode).json(err.error));
});

router.route('/secret/:id').get((req, res) => {
  vault.read({
    id: req.id
  }).then((secret) => {
    res.status(res.statusCode).json(secret);
  });
});

app.listen(DEFAULT_PORT, () => {
  console.log(`Listening on ${DEFAULT_PORT}`);
});
