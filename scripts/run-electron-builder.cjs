'use strict';

/**
 * Runs electron-builder after stripping empty CSC_* env vars so Release builds
 * without Apple certs use the same unsigned path as PR builds (ad-hoc afterPack).
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { clearEmptyCscEnv } = require('./clear-empty-csc-env.cjs');

clearEmptyCscEnv();

const electronBuilderBin = path.join(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder',
);

const args = process.argv.slice(2);
const result = spawnSync(electronBuilderBin, args, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

if (result.error) {
  throw result.error;
}
process.exit(result.status == null ? 1 : result.status);
