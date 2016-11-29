/* global Config */
'use strict';

const Vaulted = require('vaulted');
const promisify = require('./../utils/promisify');
const AWS = require('aws-sdk');
const http = require('http');
const STATUS_CODES = require('./../control/util/status-codes');
const preconditions = require('conditional');
const checkNotNull = preconditions.checkNotNull;

const METADATA_ENDPOINTS = [
  '/latest/dynamic/instance-identity/document',
  '/latest/dynamic/instance-identity/signature',
  '/latest/dynamic/instance-identity/pkcs7'
];

// Default Vault connection options
const DEFAULT_VAULT_PORT = Config.get('vault:port');
const DEFAULT_VAULT_HOST = Config.get('vault:host');
const DEFAULT_VAULT_TLS = Config.get('vault:tls');

const DEFAULT_METADATA_HOST = Config.get('metadata:host');

// Default Warden connection options
const DEFAULT_WARDEN_HOST = Config.get('warden:host');
const DEFAULT_WARDEN_PORT = Config.get('warden:port');
const DEFAULT_WARDEN_PATH = Config.get('warden:path');

const VAULT_TOKEN_TTL = Config.get('vault:token_ttl');

/**
 * Provider type for Vault tokens
 *
 * This class is responsible for managing the coordination between Tokend, Warden, and Vault.
 */
class TokenProvider {
  /**
   * Constructor
   * @param {string} secret
   * @param {string} token
   * @param {object} [options]
   * @param {string} [options.metadata.host]
   * @param {AWS.MetadataService} [options.metadata.client]
   * @param {string} [options.vault.host]
   * @param {number} [options.vault.port]
   * @param {boolean} [options.vault.ssl]
   * @param {Vaulted} [options.vault.client]
   * @param {string} [options.warden.host]
   * @param {number} [options.warden.port]
   * @returns {TokenProvider}
   */
  constructor(secret, token, options) {
    // Secret and token are required arguments based on how providers are instantiated in
    // StorageService#_getLeaseManager() and we need access to the options arg
    checkNotNull(secret, 'secret argument is required');
    checkNotNull(token, 'token argument is required');

    const opts = options || {};

    // Set metadata options
    let metadata = null,
      client = null;

    if (opts.metadata) {
      opts.metadata.host = opts.metadata.host || DEFAULT_METADATA_HOST;

      metadata = opts.metadata.client;
    } else {
      opts.metadata = {
        host: DEFAULT_METADATA_HOST
      };
    }
    if (!!metadata && metadata instanceof AWS.MetadataService) {
      this._metadata = metadata;
    } else {
      this._metadata = new AWS.MetadataService({host: opts.metadata.host});
    }

    // Set Vault connection options
    const vault = {
      vault_host: DEFAULT_VAULT_HOST,
      vault_port: DEFAULT_VAULT_PORT,
      vault_ssl: DEFAULT_VAULT_TLS
    };

    if (opts.vault) {
      vault.vault_host = opts.vault.host || DEFAULT_VAULT_HOST;
      vault.vault_port = opts.vault.port || DEFAULT_VAULT_PORT;
      vault.vault_ssl = opts.vault.ssl || DEFAULT_VAULT_TLS;

      client = opts.vault.client;
    }

    if (!!client && client instanceof Vaulted) {
      this._client = client;
    } else {
      this._client = new Vaulted(vault);
    }
    this._client.setInitialized();

    // Set Warden connection options
    this._warden = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      hostname: DEFAULT_WARDEN_HOST,
      port: DEFAULT_WARDEN_PORT,
      path: DEFAULT_WARDEN_PATH
    };

    if (opts.warden) {
      this._warden.hostname = opts.warden.host;
      this._warden.port = opts.warden.port;
    }

    this.token = null;
    this.data = null;

    return this;
  }

  /**
   * Gets the initial authenticated Vault token
   *
   * POSTs the instance identity data to Warden and then parses
   * the response to return a token.
   *
   * @returns {Promise}
   */
  initialize() {
    if (this.data) {
      return Promise.resolve(this.data);
    }

    return this._getDocument()
      .then((data) => this._sendDocument(data))
      .then((data) => {
        const token = data.client_token;

        this.token = token;
        this.data = {
          lease_id: token,
          lease_duration: data.lease_duration,
          data: {
            token
          }
        };

        return this.data;
      });
  }

  /**
   * Renews the Vault auth token
   * @returns {Promise}
   */
  renew() {
    if (!this.token) {
      return Promise.reject(new Error('This token provider has not been initialized or has not received a valid' +
          ' token from' +
          ' Warden.'));
    }

    return this._client.prepare(this.token)
      .then(this._client.renewToken.bind(this._client, {
        id: this.token,
        token: this.token,
        body: {increment: VAULT_TOKEN_TTL}
      }, null))
      .then((data) => {
        this.data = {
          lease_duration: data.auth.lease_duration,
          data: {
            token: data.auth.client_token
          }
        };

        return this.data;
      });
  }

  /**
   * Send the metadata instance identity document to Warden
   * @param {object} data
   * @returns {Promise}
   * @private
   */
  _sendDocument(data) {
    return this._post({
      document: data[0],
      signature: `-----BEGIN PKCS7-----\n${data[2]}\n-----END PKCS7-----\n`
    });
  }

  /**
   * Get the metadata instance identity document and signature
   * @returns {Promise}
   * @private
   */
  _getDocument() {
    return Promise.all(METADATA_ENDPOINTS.map((path) => { // eslint-disable-line arrow-body-style
      return promisify((done) => this._metadata.request(path, done));
    }));
  }

  /**
   * Sends the POST request wrapped in a Promise
   * @param {object} payload
   * @returns {Promise}
   * @private
   */
  _post(payload) {
    const payloadStr = JSON.stringify(payload);

    this._warden.headers['Content-Length'] = payloadStr.length;

    return new Promise((resolve, reject) => {
      const req = http.request(this._warden, (res) => {
        let body = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => body += chunk);
        res.on('end', (chunk) => {
          if (chunk) {
            body += chunk;
          }

          if (res.statusCode !== STATUS_CODES.OK) {
            reject(new Error(`${res.statusCode}: ${body}`));

            return;
          }

          let parsedBody;

          try {
            parsedBody = JSON.parse(body);
          } catch (ex) {
            req.emit('error', ex);

            return;
          }

          resolve(parsedBody);
        });
      }).on('error', (err) => reject(err));

      req.write(payloadStr);
      req.end();
    });
  }
}

module.exports = TokenProvider;
