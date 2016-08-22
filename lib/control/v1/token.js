'use strict';

const TokenProvider = require('../../providers/token');

function Token(storage) {
  return (req, res) => {
    storage.lookup('default', 'default', TokenProvider)
      .then((result) => res.json(result))
      .catch((err) => res.json({error: err.message}));
  };
}

module.exports = Token;
