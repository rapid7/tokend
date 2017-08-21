'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const Vault = require('node-vault');

const DEFAULT_PORT = 8705;
const VAULT_PORT = 8200;
const token = process.argv[2];

const app = express();
const router = express.Router();
const vault = new Vault({
  endpoint: `http://127.0.0.1:${VAULT_PORT}`,
  token
});

app.use(bodyParser.json());
app.use(router);

router.param('id', (req, res, next, id) => {
  req.id = id;
  next();
});

router.route('/v1/authenticate').post((req, res) => {
  vault.mounts().then((mounts) => {
    if (!mounts.hasOwnProperty('transit/')) {
      vault.mount({
        mount_point: 'transit',
        type: 'transit'
      });
    }
  }).then(() => {
    let token;

    vault.tokenCreate({
      ttl: '1m',
      renewable: true,
      no_parent: true
    }).then((data) => {
      token = data.auth;

      return vault.tokenLookupAccessor({accessor: data.auth.accessor});
    }).then((resp) => {
      const creation_time = resp.data.creation_time * 1000;
      const explicit_max_ttl = resp.data.explicit_max_ttl * 1000;

      if (explicit_max_ttl === 0) {
        return vault.request({
          path: '/sys/mounts/auth/token/tune',
          method: 'GET'
        }).then((resp) => ({
          creation_time,
          explicit_max_ttl: resp.max_lease_ttl * 1000
        }));
      }

      return {
        creation_time,
        explicit_max_ttl
      };
    }).then((data) => ({
      creation_time: new Date(data.creation_time).toISOString(),
      expiration_time: new Date(data.creation_time + data.explicit_max_ttl).toISOString()
    })).then((data) => {
      if (data.expiration_time <= data.creation_time) {
        throw new Error('Token has already expired');
      }

      const resp = Object.assign({}, token, data);

      console.log(resp);
      res.json(resp);
    });
  }).catch((err) => {
    console.log(err);
    res.status(err.statusCode).json(err.error);
  });
});

router.route('/mounts').get((req, res) => {
  vault.mounts()
    .then((mounts) => res.json(mounts))
    .catch((err) => res.status(err.statusCode).json(err.error));
});

router.route('/auths').get((req, res) => {
  vault.auths()
    .then((authMounts) => res.json(authMounts))
    .catch((err) => res.status(err.statusCode).json(err.error));
});

router.route('/secret/:id').get((req, res) => {
  vault.read(req.id).then((secret) => {
    res.status(res.statusCode).json(secret);
  });
});

app.listen(DEFAULT_PORT, () => {
  console.log(`Listening on ${DEFAULT_PORT}`);
});
