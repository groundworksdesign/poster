// Minimal vendor stub for @remix-run/node to allow offline server startup.
// This does NOT implement Remix features — it only returns an express handler
// that serves `public/cra-index.html` so `npm run start:remix` can run in offline/dev mode.
// (Do not use public/index.html — it may be absent so Remix is not shadowed by the CRA shell.)

const path = require('path');
const fs = require('fs');

function createRequestHandler(opts) {
  return (req, res, next) => {
    const indexPath = path.join(__dirname, '..', '..', '..', 'public', 'cra-index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath, (err) => {
        if (err) return next(err);
      });
    } else {
      res.status(500).send('Vendor stub: public/cra-index.html not found. Real Remix runtime required for full server behavior.');
    }
  };
}

module.exports = { createRequestHandler };
