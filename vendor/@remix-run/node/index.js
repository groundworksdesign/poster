// Minimal vendor stub for @remix-run/node to allow offline server startup.
// This does NOT implement Remix features — it only returns an express handler
// that serves public/index.html so `npm run start:remix` can run in offline/dev mode.

const path = require('path');
const fs = require('fs');

function createRequestHandler(opts) {
  return (req, res, next) => {
    const indexPath = path.join(__dirname, '..', '..', '..', 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath, (err) => {
        if (err) return next(err);
      });
    } else {
      res.status(500).send('Vendor stub: public/index.html not found. Real Remix runtime required for full server behavior.');
    }
  };
}

module.exports = { createRequestHandler };
