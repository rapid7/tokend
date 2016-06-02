'use strict';

function Secret(storage) {
  return (req, res) => {
    const mount = req.params.mount;
    const role = req.params.role;

    storage.lookup(`/v1/secret/default/${mount}/${role}`, (err, result) => {
      const response = (err) ? {error: err.message} : result;

      res.json(response);
    });
  };
}

module.exports = Secret;
