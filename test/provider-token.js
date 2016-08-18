'use strict';

const chai = require('chai');
const sinon = require('sinon');
const should = require('should');
const nock = require('nock');
const AWS = require('aws-sdk');
const STATUS_CODES = require('./../lib/control/util/status-codes');
const Vaulted = require('vaulted');
const TokenProvider = require('../lib/providers/token');

const VAULT_PORT = 3030;
const WARDEN_PORT = 8080;

chai.use(require('chai-as-promised'));

function setUp() {
  const stub = sinon.stub();

  stub.onFirstCall().callsArgWith(1, null, JSON.stringify({doc: {foo: 'bar',baz: true}}))
      .onSecondCall().callsArgWith(1, null, 'signature')
      .onThirdCall().callsArgWith(1, null, 'pkcs7 signature');

  const m = new AWS.MetadataService({host: '10.10.10.10'});
  const v = new Vaulted({vault_host: '127.0.0.1', vault_port: VAULT_PORT, vault_ssl: false});
  const warden = {host: '127.0.0.1', port: WARDEN_PORT};
  const token = new TokenProvider('', '', {metadata: {client: m}, vault: {client: v}, warden});

  return {
    warden,
    token,
    stub
  }
}

describe('Provider/Token', function() {
  const _MetadataService = AWS.MetadataService.prototype.request;

  describe('TokenProvider#constructor', function() {
    it('Can instantiate dependent services configured with options', function() {
      const token = new TokenProvider('', '', {
        metadata: {host: '10.10.10.10'},
        vault: {host: 'vaultserver.com', port: VAULT_PORT, ssl: true},
        warden: {host: 'wardenurl.net', port: WARDEN_PORT}
      });

      token._metadata.should.be.instanceof(AWS.MetadataService);
      token._metadata.host.should.equal('10.10.10.10');

      token._client.should.be.instanceof(Vaulted);
      token._client.config.get('vault_host').should.equal('vaultserver.com');
      token._client.config.get('vault_port').should.equal(VAULT_PORT);
      token._client.config.get('vault_ssl').should.equal(true);

      token._warden.should.be.Object();
      token._warden.hostname.should.equal('wardenurl.net');
      token._warden.port.should.equal(WARDEN_PORT);
    });

    it('Can instantiate dependent services by passing instances of them via options', function() {
      const m = new AWS.MetadataService({host: '10.10.10.10'});
      const v = new Vaulted({vault_host: 'vaultserver.com', vault_port: VAULT_PORT, vault_ssl: true});
      const token = new TokenProvider('', '', {
        metadata: {client: m},
        vault: {client: v},
        warden: {host: 'wardenurl.net', port: WARDEN_PORT}
      });

      token._metadata.should.be.instanceof(AWS.MetadataService);
      token._metadata.host.should.equal('10.10.10.10');

      token._client.should.be.instanceof(Vaulted);
      token._client.config.get('vault_host').should.equal('vaultserver.com');
      token._client.config.get('vault_port').should.equal(VAULT_PORT);
      token._client.config.get('vault_ssl').should.equal(true);
    });

    it('Falls back on defaults if options aren\'t provided', function() {
      const token = new TokenProvider('', '');

      token._metadata.should.be.instanceof(AWS.MetadataService);
      token._metadata.host.should.equal('169.254.169.254');

      token._client.should.be.instanceof(Vaulted);
      token._client.config.get('vault_host').should.equal('127.0.0.1');
      token._client.config.get('vault_port').should.equal(8200); // eslint-disable-line rapid7/static-magic-numbers
      token._client.config.get('vault_ssl').should.equal(true);

      token._warden.should.be.Object();
      token._warden.hostname.should.equal('127.0.0.1');
      token._warden.port.should.equal(3000); // eslint-disable-line rapid7/static-magic-numbers
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
        doc: {foo: 'bar',baz: true}
      });

      return this.token._getDocument().should.eventually.eql([doc, 'signature', 'pkcs7 signature']);
    });

    it('Sends instance identity data to a Warden server', function() {
      const resp = {
        lease_duration: 300, // eslint-disable-line rapid7/static-magic-numbers
        renewable: true,
        data: {token: 'somereallycooltoken'}
      };

      nock(`http://${this.warden.host}:${this.warden.port}/`).post().once().reply(STATUS_CODES.OK, resp);

      this.token._getDocument().then(this.token._sendDocument.bind(this.token)).should.eventually.eql(resp);
    });

    it('Returns a resolved Promise if the Warden server returns it', function() {
      const resp = {
        lease_duration: 300, // eslint-disable-line rapid7/static-magic-numbers
        renewable: true,
        data: {token: 'somereallycooltoken'}
      };

      nock(`http://${this.warden.host}:${this.warden.port}/`).post().once().reply(STATUS_CODES.OK, resp);

      return this.token.initialize().then((data) => {
        data.should.eql({
          lease_id: resp.data.token,
          lease_duration: resp.lease_duration,
          data: resp.data
        });
      }).catch((err) => {
        done(err);
      });
    });

    it('Returns a rejected Promise if it fails to get instance identity data', function() {
      AWS.MetadataService.prototype.request = _MetadataService;
      const m = new AWS.MetadataService({
        host: '169.254.169.254',
        httpOptions: {timeout: 200} // eslint-disable-line rapid7/static-magic-numbers
      });
      const v = new Vaulted({vault_host: '127.0.0.1', vault_port: VAULT_PORT, vault_ssl: true});
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

      nock(`http://${this.warden.host}:${this.warden.port}/`)
          .post()
          .once()
          .reply(STATUS_CODES.BAD_REQUEST, resp);

      return this.token.initialize().then((data) => {
        should(data).be.null();
      }).catch((err) => {
        err.should.be.an.Error();
        err.message.should.equal(`${STATUS_CODES.BAD_REQUEST}: ${JSON.stringify(resp)}`);
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

      scope.post('/v1/auth/token/renew/somereallycooltoken')
        .reply(STATUS_CODES.OK, {
          auth: {client_token: 'somereallycooltoken', policies: [], metadata: {}, lease_duration, renewable: true}
        });
      this.token.token = 'somereallycooltoken';

      return this.token.renew().then((data) => {
        data.should.eql({lease_duration, token: 'somereallycooltoken'});
      }).catch((err) => {
        should(err).be.null();
      });
    });

    it('Returns a rejected Promise if the token cannot be renewed', function() {
      scope.post('/v1/auth/token/renew/somereallycooltoken')
        .reply(STATUS_CODES.BAD_REQUEST, {errors: ['This token cannot be renewed']});
      this.token.token = 'somereallycooltoken';

      this.token.renew().then((data) => {
        should(data).be.null();
      }).catch((err) => {
        err.should.be.an.Error();
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
  });
});
