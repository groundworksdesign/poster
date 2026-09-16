#!/usr/bin/env node
/**
 * Prepare a flat production node_modules tree for electron-builder.
 *
 * The packaged Electron app spawns src/adapters/persistence/server.js via ELECTRON_RUN_AS_NODE.
 * That child needs express / Remix / better-sqlite3 on disk. electron-builder's
 * default dependency crawl does not pack pnpm's isolated node_modules, and the
 * beforeBuild hook intentionally skips install — so v0.1.4-pr.1 shipped with
 * zero node_modules and the UI never appeared.
 *
 * Only server/SSR runtime deps are installed (not react-scripts / test tooling).
 * Packing the full package.json "dependencies" tree caused EMFILE on macOS CI
 * when signing dual-arch DMGs.
 */
'use strict';

const { execSync } = require('child_process');
const {
  existsSync,
  mkdirSync,
  cpSync,
  rmSync,
  writeFileSync,
  readFileSync,
} = require('fs');
const { join } = require('path');

const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'dist', 'electron-prod-modules');

/** Runtime packages required by src/adapters/persistence/server.js + Remix SSR. */
const RUNTIME_DEP_NAMES = [
  '@remix-run/express',
  '@remix-run/node',
  '@remix-run/react',
  '@remix-run/serve',
  'better-sqlite3',
  // Main-process dependency for Win/Linux in-app updates (Mac is alert-only).
  'electron-updater',
  'express',
  'isbot',
  'react',
  'react-dom',
];

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

const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const dependencies = {};
for (const name of RUNTIME_DEP_NAMES) {
  if (!rootPkg.dependencies || !rootPkg.dependencies[name]) {
    die(`package.json missing runtime dependency: ${name}`);
  }
  dependencies[name] = rootPkg.dependencies[name];
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

writeFileSync(
  join(OUT, 'package.json'),
  `${JSON.stringify(
    {
      name: `${rootPkg.name}-electron-runtime`,
      version: rootPkg.version,
      private: true,
      dependencies,
    },
    null,
    2,
  )}\n`,
);

if (existsSync(join(ROOT, '.npmrc'))) {
  cpSync(join(ROOT, '.npmrc'), join(OUT, '.npmrc'));
}

log(`Installing slim runtime node_modules into ${OUT}`);
// No frozen lockfile: this package.json is a filtered subset of root deps.
run('pnpm install --prod --shamefully-hoist', OUT);

if (existsSync(join(OUT, 'node_modules', 'better-sqlite3'))) {
  log('Rebuilding better-sqlite3 native bindings for the packaged tree');
  try {
    run('pnpm rebuild better-sqlite3', OUT);
  } catch (err) {
    log(`warning: better-sqlite3 rebuild failed: ${err.message || err}`);
  }
}

if (!existsSync(join(OUT, 'node_modules', 'express'))) {
  die('express missing from prepared node_modules — packaging would still fail');
}

log('Electron production node_modules ready.');
