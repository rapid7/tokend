'use strict';

const AWS = require('aws-sdk');
const promisify = require('./../utils/promisify');
const DEFAULT_METADATA_HOST = Config.get('metadata:host');

/**
 * Create an AWS.MetadataService client
 * @param {Object} options
 * @return {AWS.MetadataService}
 */
function getMetadata(options) {
  const opts = options || {};

  let metadata = null;

  if (opts.metadata) {
    opts.metadata.host = opts.metadata.host || DEFAULT_METADATA_HOST;

    metadata = opts.metadata.client;
  } else {
    opts.metadata = {
      host: DEFAULT_METADATA_HOST
    };
  }

  if (!!metadata && metadata instanceof AWS.MetadataService) {
    return metadata;
  }

  return new AWS.MetadataService({host: opts.metadata.host});
}

/**
 * Get the instance's region from its metadata
 * @param {AWS.MetadataService} [metadata]
 * @return {Promise}
 */
function getRegion(metadata) {
  let client = (metadata) ? metadata : getMetadata();

  return promisify((done) => client.request('/latest/dynamic/instance-identity/document', done)).then((data) => {
    let document = null;

    try {
      document = JSON.parse(data);
    } catch (ex) {
      throw ex;
    }

    return document.region;
  });
}

module.exports = {
  metadata: getMetadata,
  region: getRegion
};
