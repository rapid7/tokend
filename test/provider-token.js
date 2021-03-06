'use strict';

const chai = require('chai');
const sinon = require('sinon');
const should = require('should');
const nock = require('nock');
const errors = require('request-promise-native/errors');
const AWS = require('aws-sdk');
const STATUS_CODES = require('./../lib/control/util/status-codes');
const Vault = require('node-vault');
const TokenProvider = require('../lib/providers/token');

const VAULT_PORT = 3030;
const WARDEN_PORT = 8080;

chai.use(require('chai-as-promised'));

function setUp() {
  const stub = sinon.stub();

  stub.onFirstCall().callsArgWith(1, null, JSON.stringify({doc: {foo: 'bar', baz: true}}))
      .onSecondCall().callsArgWith(1, null, 'signature')
      .onThirdCall().callsArgWith(1, null, 'pkcs7 signature');

  const m = new AWS.MetadataService({host: '10.10.10.10'});
  const v = new Vault({
    endpoint: `http://127.0.0.1:${VAULT_PORT}`
  });
  const warden = {host: '127.0.0.1', port: WARDEN_PORT};
  const token = new TokenProvider('', '', {metadata: {client: m}, vault: {client: v}, warden});

  return {
    warden,
    token,
    stub
  };
}

describe('Provider/Token', function() {
  const _MetadataService = AWS.MetadataService.prototype.request;

  describe('TokenProvider#constructor', function() {
    it('Can instantiate dependent services configured with options', function() {
      const token = new TokenProvider('', '', {
        metadata: {host: '10.10.10.10'},
        vault: {endpoint: `https://vaultserver.com:${VAULT_PORT}`},
        warden: {host: 'wardenurl.net', port: WARDEN_PORT}
      });

      token._metadata.should.be.instanceof(AWS.MetadataService);
      token._metadata.host.should.equal('10.10.10.10');

      token._client.endpoint.should.equal(`https://vaultserver.com:${VAULT_PORT}`);

      token._warden.should.be.Object();
      token._warden.uri.should.equal(`http://wardenurl.net:${WARDEN_PORT}/`);
    });

    it('Can instantiate dependent services by passing instances of them via options', function() {
      const m = new AWS.MetadataService({host: '10.10.10.10'});
      const v = new Vault({
        endpoint: `https://vaultserver.com:${VAULT_PORT}`
      });
      const token = new TokenProvider('', '', {
        metadata: {client: m},
        vault: {client: v},
        warden: {host: 'wardenurl.net', port: WARDEN_PORT}
      });

      token._metadata.should.be.instanceof(AWS.MetadataService);
      token._metadata.host.should.equal('10.10.10.10');

      token._client.should.have.properties('apiVersion', 'endpoint', 'token', 'read', 'write', 'request', 'list', 'help');
      token._client.endpoint.should.equal(`https://vaultserver.com:${VAULT_PORT}`);
    });

    it('Falls back on defaults if options aren\'t provided', function() {
      const token = new TokenProvider('', '');

      token._metadata.should.be.instanceof(AWS.MetadataService);
      token._metadata.host.should.equal('169.254.169.254');

      token._client.endpoint.should.equal('https://127.0.0.1:8200');

      token._warden.should.be.Object();
      token._warden.uri.should.equal('http://127.0.0.1:3000/');
    });
  });

  describe('TokenProvider#initialize', function() {
    beforeEach(function() {
      const setup = setUp();

      AWS.MetadataService.prototype.request = setup.stub;
      this.warden = setup.warden;
      this.token = setup.token;
    });

    afterEach(function() {
      this.token = null;
      this.warden = null;
      AWS.MetadataService.prototype.request = _MetadataService;
    });

    it('Retrieves instance identity data from the EC2 Metadata Service', function() {
      const doc = JSON.stringify({
        doc: {foo: 'bar', baz: true}
      });

      return this.token._getDocument().should.eventually.eql([doc, 'signature', 'pkcs7 signature']);
    });

    it('Sends instance identity data to a Warden server', function() {
      const resp = {
        lease_duration: 300, // eslint-disable-line rapid7/static-magic-numbers
        renewable: true,
        data: {token: 'somereallycooltoken'}
      };

      nock(`http://${this.warden.host}:${this.warden.port}`).post('/').once().reply(STATUS_CODES.OK, resp);

      return this.token._getDocument().then(this.token._sendDocument.bind(this.token)).should.eventually.eql(resp);
    });

    it('Returns a resolved Promise if the Warden server returns it', function() {
      const resp = {
        lease_duration: 300, // eslint-disable-line rapid7/static-magic-numbers
        renewable: true,
        client_token: 'somereallycooltoken',
        policies: ['web', 'stage'],
        metadata: {user: 'me!'}
      };

      nock(`http://${this.warden.host}:${this.warden.port}`).post('/').once().reply(STATUS_CODES.OK, resp);

      return this.token.initialize().then((data) => {
        data.should.eql({
          lease_id: resp.client_token,
          lease_duration: resp.lease_duration,
          data: {
            token: resp.client_token
          }
        });
      });
    });

    it('Returns a rejected Promise if it fails to get instance identity data', function() {
      AWS.MetadataService.prototype.request = _MetadataService;
      const m = new AWS.MetadataService({
        host: '169.254.169.254',
        httpOptions: {timeout: 200} // eslint-disable-line rapid7/static-magic-numbers
      });

      const v = new Vault({
        endpoint: `https://127.0.0.1:${VAULT_PORT}`
      });
      const token = new TokenProvider('', '', {metadata: {client: m}, vault: {client: v}, warden: this.warden});

      nock('http://169.254.169.254').get('/').thrice();

      return token.initialize().then((data) => {
        should(data).be.null();
      }).catch((err) => {
        err.should.be.an.Error();
      });
    });

    it('Returns a rejected Promise if it fails to send data to a Warden server', function() {
      return this.token.initialize()
        .then((data) => {
          should(data).be.null();
        })
        .catch((err) => {
          err.should.be.an.Error();
        });
    });

    it('Returns a rejected Promise if it cannot parse the response from the Warden server', function() {
      nock(`http://${this.warden.host}:${this.warden.port}/`)
        .post()
        .once()
        .reply(STATUS_CODES.OK, {this: 'is', bad: 'response'});

      return this.token.initialize().then((data) => {
        should(data).be.null();
      }).catch((err) => {
        err.should.be.an.Error();
      });
    });

    it('Returns a rejected Promise if it does not receive a 200OK from the Warden server', function() {
      const resp = {this: 'is', bad: 'response'};

      nock(`http://${this.warden.host}:${this.warden.port}`)
          .post('/')
          .once()
          .reply(STATUS_CODES.BAD_REQUEST, resp);

      return this.token.initialize().then((data) => {
        should(data).be.null();
      }).catch((err) => {
        err.should.be.instanceOf(errors.StatusCodeError);
        err.message.should.equal(`${STATUS_CODES.BAD_REQUEST} - ${JSON.stringify(resp)}`);
      });
    });

    it('Returns previously retrieved data if initialize() is called again', function() {
      const resp = {
        lease_duration: 300, // eslint-disable-line rapid7/static-magic-numbers
        renewable: true,
        client_token: 'somereallycooltoken',
        policies: ['web', 'stage'],
        metadata: {user: 'me!'}
      };
      const expectedData = {
        lease_id: resp.client_token,
        lease_duration: resp.lease_duration,
        data: {
          token: resp.client_token
        }
      };

      nock(`http://${this.warden.host}:${this.warden.port}`).post('/').once().reply(STATUS_CODES.OK, resp);

      return this.token.initialize().then((data) => {
        data.should.eql(expectedData);
      }).then(() => this.token.initialize())
        .then((data) => {
          data.should.eql(expectedData);
        });
    });
  });

  describe('TokenProvider#renew', function() {
    let scope;

    beforeEach(function() {
      const setup = setUp();

      AWS.MetadataService.prototype.request = setup.stub;
      this.warden = setup.warden;
      this.token = setup.token;
      scope = nock(`http://127.0.0.1:${VAULT_PORT}/`)
          .get('/v1/sys/init')
          .reply(STATUS_CODES.OK, {initialized: true})
          .get('/v1/sys/seal-status')
          .reply(STATUS_CODES.OK, {sealed: false, t: 1, n: 1, progress: 1})
          .get('/v1/sys/mounts')
          .reply(STATUS_CODES.OK, {'secret/': {config: {default_lease_ttl: 0, max_lease_ttl: 0}, type: 'generic'}})
          .get('/v1/sys/auth')
          .reply(STATUS_CODES.OK, {'token/': {type: 'token'}});
    });

    afterEach(function() {
      this.token = null;
      this.warden = null;
      AWS.MetadataService.prototype.request = _MetadataService;
    });

    it('Renews the Vault token when #renew() is called', function() {
      const lease_duration = 300;

      scope.post('/v1/auth/token/renew')
        .reply(STATUS_CODES.OK, {
          auth: {client_token: 'somereallycooltoken', policies: [], metadata: {}, lease_duration, renewable: true}
        });
      this.token.token = 'somereallycooltoken';

      return this.token.renew().then((data) => {
        data.should.eql({
          lease_duration,
          data: {
            token: 'somereallycooltoken'
          }
        });
      }).catch((err) => {
        should(err).be.null();
      });
    });

    it('Returns a rejected Promise if the token cannot be renewed', function() {
      scope.post('/v1/auth/token/renew/somereallycooltoken')
        .reply(STATUS_CODES.BAD_REQUEST, {errors: ['This token cannot be renewed']});
      this.token.token = 'somereallycooltoken';

      return this.token.renew().then((data) => {
        should(data).be.null();
      }).catch((err) => {
        err.should.be.an.Error();
        err.name.should.equal('StatusCodeError');
      });
    });

    it('Returns a rejected Promise if the token has not been initialized', function() {
      this.token.token = null;

      return this.token.renew().then((data) => {
        should(data).be.null();
      }).catch((err) => {
        err.should.be.an.Error();
      });
    });

    it('Return existing data if it receives an error that is not a StatusCodeError', function() {
      const token = 'somereallycooltoken';
      const resp = this.token.data = {
        lease_id: token,
        lease_duration: 300,
        data: {
          token
        }
      };

      scope.post('/v1/auth/token/renew/somereallycooltoken').replyWithError('');
      this.token.token = token;
      this.token.data = resp;

      return this.token.renew().then((data) => {
        should(data).not.be.null();
        data.should.equal(resp);
      });
    });
  });

  describe('TokenProvider#invalidate', function() {
    beforeEach(function() {
      const setup = setUp();

      AWS.MetadataService.prototype.request = setup.stub;
      this.warden = setup.warden;
      this.token = setup.token;
    });

    afterEach(function() {
      this.token = null;
      this.warden = null;
      AWS.MetadataService.prototype.request = _MetadataService;
    });
    it('Clears the provider\'s data if #invalidate() is called', function() {
      const resp = {
        lease_duration: 300, // eslint-disable-line rapid7/static-magic-numbers
        renewable: true,
        client_token: 'somereallycooltoken',
        policies: ['web', 'stage'],
        metadata: {user: 'me!'}
      };

      nock(`http://${this.warden.host}:${this.warden.port}`).post('/').once().reply(STATUS_CODES.OK, resp);

      return this.token.initialize().then(() => {
        should(this.token.data).not.be.null();
        this.token.invalidate();
        should(this.token.data).be.null();
      });
    });
  });
});
