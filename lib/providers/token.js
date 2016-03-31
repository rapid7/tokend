'use strict';

const Vaulted = require('vaulted');
const Metadata = require('./../utils/metadata');
const http = require('http');

const HTTP_FORBIDDEN = 403;

// Default Vault connection options
const DEFAULT_VAULT_PORT = 8200;
const DEFAULT_VAULT_HOST = '127.0.0.1';
const DEFAULT_VAULT_TLS = true;

const DEFAULT_METADATA_HOST = 'http://169.254.169.254';

// Default Warden connection options
const DEFAULT_WARDEN_HOST = '127.0.0.1';
const DEFAULT_WARDEN_PORT = 3000;

class TokenProvider {
  /**
   * Constructor
   * @param {object} options
   * @param {string} options.metadata.host
   * @param {Vaulted} options.vault.client
   * @param {string} options.vault.host
   * @param {number} options.vault.port
   * @param {boolean} options.vault.ssl
   * @param {string} options.warden.host
   * @param {number} options.warden.port
   * @returns {TokenProvider}
   */
  constructor(options) {
    const opts = options || {};

    // Set metadata options
    if (opts.metadata) {
      opts.metadata.host = opts.metadata.host || DEFAULT_METADATA_HOST;
    } else {
      opts.metadata = {
        host: DEFAULT_METADATA_HOST
      };
    }
    this._metadata = new Metadata(opts.metadata.host);

    // Set Vault connection options
    const vault = {
      vault_host: DEFAULT_VAULT_HOST,
      vault_port: DEFAULT_VAULT_PORT,
      vault_ssl: DEFAULT_VAULT_TLS
    };

    let client = null;

    if (opts.vault) {
      vault.vault_host = opts.vault.host || DEFAULT_VAULT_HOST;
      vault.vault_port = opts.vault.port || DEFAULT_VAULT_PORT;
      vault.vault_ssl = opts.vault.ssl || DEFAULT_VAULT_TLS;

      client = opts.vault.client;
    }

    this._client = (!!client && client instanceof Vaulted) ? client : new Vaulted(vault);
    this._client.setInitialized();

    // Set Warden connection options
    this.warden = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    };

    if (opts.warden) {
      this.warden.hostname = opts.warden.host || DEFAULT_WARDEN_HOST;
      this.warden.port = opts.warden.port || DEFAULT_WARDEN_PORT;
    }

    this.token = null;

    return this;
  }

  /**
   * Gets the initial authenticated Vault token
   *
   * POSTs the instance identity data to Warden and then parses
   * the response to return a token.
   *
   * @param {function} callback
   */
  initialize(callback) {
    this._sendDocument().then((data) => {
      this.token = data.data.token;

      return callback(null, {
        lease_id: data.data.token,
        lease_duration: data.lease_duration,
        data
      });
    }).catch((err) => callback(err, null));
  }

  /**
   * Renews the Vault auth token
   * @param {function} callback
   * @returns {*}
   */
  renew(callback) {
    if (!this.token) {
      return callback(new Error('This token provider has not been initialized or has not received a valid token from' +
          ' Warden.', null));
    }

    this._client.prepare(this.token)
      .then(this._client.renewToken.bind(this._client, {id: this.token, token: this.token}, null))
      .then((data) => {
        return callback(null, {
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
      this._metadata.get().then((data) => {
        resolve(this._post({
          document: JSON.parse(data[0]),
          signature: data[1],
          pkcs7: data[2]
        }));
      })
      .catch((err) => reject(err));
    });
  }

  /**
   * Sends the POST request wrapped in a Promise
   * @param {object} payload
   * @returns {Promise}
   * @private
   */
  _post(payload) {
    return new Promise((resolve, reject) => {
      const req = http.request(this.warden, (res) => {
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
