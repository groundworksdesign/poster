#!/usr/bin/env node
/**
 * Prepare a flat production node_modules tree for electron-builder.
 *
 * The packaged Electron app spawns server/index.js via ELECTRON_RUN_AS_NODE.
 * That child needs express / Remix / better-sqlite3 on disk. electron-builder's
 * default dependency crawl does not pack pnpm's isolated node_modules, and the
 * beforeBuild hook intentionally skips install — so v0.1.4-pr.1 shipped with
 * zero node_modules and the UI never appeared.
 *
 * Mirrors the portable-zip prod install (shamefully-hoist) into
 * dist/electron-prod-modules/, which electron-builder.yml maps to node_modules.
 */
'use strict';

const { execSync } = require('child_process');
const {
  existsSync,
  mkdirSync,
  cpSync,
  rmSync,
} = require('fs');
const { join } = require('path');

const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'dist', 'electron-prod-modules');

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function die(msg) {
  process.stderr.write(`ERROR: ${msg}\n`);
  process.exit(1);
}

function run(cmd, cwd) {
  log(`+ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

if (!existsSync(join(ROOT, 'build'))) {
  die('build/ missing — run `pnpm run build:remix` first');
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Use the full package.json + lockfile (same as portable zip). --prod skips
// installing/linking devDependencies while keeping the lockfile valid.
cpSync(join(ROOT, 'package.json'), join(OUT, 'package.json'));
cpSync(join(ROOT, 'pnpm-lock.yaml'), join(OUT, 'pnpm-lock.yaml'));
if (existsSync(join(ROOT, '.npmrc'))) {
  cpSync(join(ROOT, '.npmrc'), join(OUT, '.npmrc'));
}

log(`Installing flat production node_modules into ${OUT}`);
run('pnpm install --prod --shamefully-hoist --frozen-lockfile', OUT);

if (existsSync(join(OUT, 'node_modules', 'better-sqlite3'))) {
  log('Rebuilding better-sqlite3 native bindings for the packaged tree');
  // pnpm may ignore dependency build scripts by policy; force a rebuild so the
  // addon exists on disk. ELECTRON_RUN_AS_NODE can still fall back to
  // node:sqlite / JSON if the Electron ABI differs.
  try {
    run('npm rebuild better-sqlite3', OUT);
  } catch (err) {
    log(`warning: better-sqlite3 rebuild failed: ${err.message || err}`);
  }
}

if (!existsSync(join(OUT, 'node_modules', 'express'))) {
  die('express missing from prepared node_modules — packaging would still fail');
}

log('Electron production node_modules ready.');
