'use strict';

/**
 * Serve mocked metadata path data from a local HTTP interface
 */

const HTTP = require('http');
const STATUS_CODES = require('../../lib/control/util/status-codes');
const Config = require('nconf').env();
const metadata = require('../data/metadata.json');

const addr = Config.get('METADATA_HOST');
const port = (addr.split(':').length === 2) ? addr.split(':').pop() : '80';

const NOT_FOUND_BODY =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"\n' +
  '         "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' +
  '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">\n' +
  '<head>\n' +
  '  <title>404 - Not Found</title>\n' +
  ' </head>\n' +
  ' <body>\n' +
  '  <h1>404 - Not Found</h1>\n' +
  ' </body>\n' +
  '</html>\n';

function deepGet(root, path) {
  let twig = root,
      result = null;

  path.split('/').forEach((branch, index, branches) => {
    if (branch) {
      if (!twig.hasOwnProperty(branch)) {
        return null;
      }
      if (index < branches.length - 1) {
        twig = twig[branch];
      } else {
        result = twig && twig[branch];
      }
    }
  });
  return result;
}

function sendResponse(res, code, body) {
  console.log(`${new Date().toISOString()} - server responded: ${body.toString()}`);
  res.writeHead(code, {'Content-Length': body.length, 'Content-Type': 'text/plain'});
  res.end(body);
}

const server = HTTP.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - client requested: ${req.url}`);
  const slash = /\/$/.test(req.url);
  const item = deepGet(metadata, req.url.replace(/\/$/, ''));
  let code = STATUS_CODES.OK,
      body = '';

  if (typeof item === 'undefined') {
    return sendResponse(res, STATUS_CODES.NOT_FOUND, NOT_FOUND_BODY);
  }

  if (item === null) {
    return sendResponse(res, code, (slash) ? `${Object.keys(metadata).join('\n')}/` : '');
  }

  if (typeof item === 'object') {
    // if request has a trailing slash return the keys of the children, plus a trailing slash for child objects
    body = (slash) ? Object.keys(item)
        .map((key) => key + (typeof item[key] === 'object' ? '/' : ''))
        .join('\n') : body;
    return sendResponse(res, code, body);
  }

  return sendResponse(res, code, item.toString());
});

server.on('listening', () => console.log(`listening for metadata requests at http://127.0.0.1:${port}`));
server.listen(port);
