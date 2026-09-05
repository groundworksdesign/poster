'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

/**
 * electron-builder afterPack hook.
 *
 * On macOS CI, the bundled .app often ends up with an invalid code signature
 * (Electron frameworks are modified during pack). Gatekeeper + quarantine then
 * reports "damaged" instead of "unidentified developer".
 *
 * When no Developer ID certificate is configured (CSC_LINK / CSC_NAME), apply a
 * fresh ad-hoc signature so testers can launch after clearing quarantine.
 * Skips when real signing secrets are present — electron-builder handles that.
 */
function hasSigningIdentity() {
  const link = process.env.CSC_LINK;
  const name = process.env.CSC_NAME;
  return (
    (link != null && String(link).trim() !== '') ||
    (name != null && String(name).trim() !== '')
  );
}

module.exports = async function macAdhocSign(context) {
  if (process.platform !== 'darwin') return;
  // Empty CSC_LINK from Actions must not skip ad-hoc — treat blank as unsigned.
  if (hasSigningIdentity()) return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );
  const identifier = context.packager.config.appId || 'com.groundworksdesign.poster';

  execFileSync(
    'codesign',
    ['--force', '--deep', '--sign', '-', '--identifier', identifier, appPath],
    { stdio: 'inherit' },
  );
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], {
    stdio: 'inherit',
  });
};
