'use strict';

const started = Date.now();

function Health(router, storage) {
  router.get('/', (req, res) => {
    res.json({
      status: 'foo',
      uptime: Date.now() - started
    });
  });
}

module.exports = Health;
