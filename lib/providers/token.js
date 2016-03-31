'use strict';

const Vaulted = require('vaulted');
const Metadata = require('./../metadata');
const http = require('http');

const HTTP_FORBIDDEN = 403;
const DEFAULT_VAULT_PORT = 8200;
const DEFAULT_VAULT_HOST = '127.0.0.1';
const DEFAULT_VAULT_TLS = false;
const DEFAULT_METADATA_HOST = 'http://169.254.169.254';
const DEFAULT_WARDEN_HOST = '127.0.0.1';
const DEFAULT_WARDEN_PORT = 3000;

class TokenProvider {
  constructor(options) {
    const opts = options || {};

    if (opts.metadata) {
      opts.metadata.host = opts.metadata.host || DEFAULT_METADATA_HOST;
    } else {
      opts.metadata = {
        host: DEFAULT_METADATA_HOST
      };
    }
    this._metadata = new Metadata(opts.metadata.host);

    const vaultOpts = {
      vault_host: DEFAULT_VAULT_HOST,
      vault_port: DEFAULT_VAULT_PORT,
      vault_ssl: DEFAULT_VAULT_TLS
    };

    if (opts.vault) {
      vaultOpts.vault_host = opts.vault.host || DEFAULT_VAULT_HOST;
      vaultOpts.vault_port = opts.vault.port || DEFAULT_VAULT_PORT;
      vaultOpts.vault_ssl = opts.vault.ssl || DEFAULT_VAULT_TLS;
    }

    this._client = new Vaulted(vaultOpts).setInitialized();

    return this;
  }

  initialize(callback) {
    this._sendDocument().then((data) => {
      return callback(null, {
        lease_id: data.data.token,
        lease_duration: data.lease_duration,
        data
      });
    }).catch((err) => callback(err, null));
  }

  renew(token, callback) {
    this._client.prepare(token)
      .then(this._client.renewToken.bind(this._client, {id: token, token}, null))
      .then((data) => {
        callback(null, {
          lease_duration: data.auth.lease_duration,
          token: data.auth.client_token
        });
      })
      .catch((err) => callback(err, null));
  }

  /**
   * Send the metadata instance identity document to Warden
   * @returns {Promise}
   * @private
   */
  _sendDocument() {
    return new Promise((resolve, reject) => {
      const promises = this._metadata.get();

      promises.then((data) => {
        resolve(this._post({
          document: JSON.parse(data[0]),
          signature: data[1],
          pkcs7: data[2]
        }));
      })
      .catch((err) => {
        reject(err);
      });
    });
  }

  /**
   * Sends the POST request wrapped in a Promise
   * @param {object} payload
   * @returns {Promise}
   * @private
   */
  _post(payload) {
    const options = {
      hostname: DEFAULT_WARDEN_HOST,
      port: DEFAULT_WARDEN_PORT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    return new Promise((resolve, reject) => {
      let data = '';

      const req = http.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (body) => {
          if (res.statusCode === HTTP_FORBIDDEN) {
            return reject(JSON.parse(body));
          }
          return resolve(JSON.parse(body));
        });
      }).on('error', (err) => reject(err));

      req.write(JSON.stringify(payload));
      req.end();
    });
  }
}

module.exports = TokenProvider;
