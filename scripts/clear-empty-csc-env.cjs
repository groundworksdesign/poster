'use strict';

/**
 * electron-builder treats a set-but-empty CSC_LINK as a certificate path and
 * resolves it to the repo cwd ("…/poster not a file"). GitHub Actions injects
 * empty strings for missing secrets, so strip blank signing env before build.
 *
 * Mutates process.env in place. Safe to require from build wrappers and tests.
 */
const CSC_ENV_KEYS = [
  'CSC_LINK',
  'CSC_KEY_PASSWORD',
  'CSC_NAME',
  'CSC_KEYCHAIN',
  'CSC_KEYCHAIN_PASSWORD',
];

function clearEmptyCscEnv(env = process.env) {
  const cleared = [];
  for (const key of CSC_ENV_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(env, key)) continue;
    const value = env[key];
    if (value == null || String(value).trim() === '') {
      delete env[key];
      cleared.push(key);
    }
  }
  return cleared;
}

module.exports = { clearEmptyCscEnv, CSC_ENV_KEYS };

if (require.main === module) {
  const cleared = clearEmptyCscEnv();
  if (cleared.length) {
    process.stderr.write(
      `cleared empty signing env: ${cleared.join(', ')} (unsigned/ad-hoc mac path)\n`,
    );
  }
}
