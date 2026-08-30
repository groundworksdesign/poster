#!/usr/bin/env node
/**
 * Create React App expects `public/index.html`. That file must not be served as the
 * default document for `/` when running Remix (`remix dev` / remix-serve uses
 * express.static("public") and would return the empty CRA shell — a blank page).
 *
 * Keep the template as `public/cra-index.html` and copy it here only for CRA scripts.
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const src = path.join(repoRoot, "public", "cra-index.html");
const dest = path.join(repoRoot, "public", "index.html");

if (!fs.existsSync(src)) {
  console.error("sync-cra-index: missing", src);
  process.exit(1);
}
fs.copyFileSync(src, dest);
