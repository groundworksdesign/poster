#!/usr/bin/env node
/**
 * Remove `public/index.html` if present so `remix dev` / remix-serve do not serve
 * the CRA shell for `/` (see scripts/sync-cra-index.cjs). CRA workflows re-copy
 * from `public/cra-index.html` via sync when needed.
 */
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'public', 'index.html');
try {
  fs.unlinkSync(p);
} catch (e) {
  if (e && e.code !== 'ENOENT') throw e;
}
