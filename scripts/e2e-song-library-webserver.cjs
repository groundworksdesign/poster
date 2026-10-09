#!/usr/bin/env node
/**
 * Playwright webServer entry for song-library prod e2e.
 * Builds Remix once, then serves via server.js with an isolated HOME.
 * Intended to run in a separate Playwright config so it never races remix-dev.
 */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = process.env.PORT || process.env.SONG_LIBRARY_E2E_PORT || '3010';
const home =
  process.env.SONG_LIBRARY_E2E_HOME || path.join(os.tmpdir(), 'poster-song-library-e2e-home');

fs.rmSync(home, { recursive: true, force: true });
fs.mkdirSync(home, { recursive: true });

const build = spawnSync('pnpm', ['run', 'build:remix'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});
if (build.status !== 0) {
  process.exit(build.status == null ? 1 : build.status);
}

const env = {
  ...process.env,
  HOME: home,
  PORT: String(port),
  NODE_ENV: 'production',
};
delete env.POSTER_HOME;
delete env.POSTER_LIBRARY_PATH;
delete env.POSTER_DB_PATH;
delete env.POSTER_LIBRARY_JSON_PATH;

const child = spawn(process.execPath, [path.join(root, 'src', 'adapters', 'persistence', 'server.js')], {
  cwd: root,
  env,
  stdio: 'inherit',
});

const shutdown = () => {
  if (child.exitCode === null) child.kill('SIGTERM');
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

child.on('exit', code => {
  process.exit(code == null ? 1 : code);
});
