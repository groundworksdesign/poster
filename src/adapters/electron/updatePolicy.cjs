'use strict';

/**
 * Pure update-policy helpers (no Electron). Used by autoUpdate.cjs and unit tests.
 */

const DEFAULT_RELEASES_LATEST_URL =
  'https://github.com/groundworksdesign/poster/releases/latest';
const DEFAULT_GITHUB_API_LATEST =
  'https://api.github.com/repos/groundworksdesign/poster/releases/latest';

/**
 * Strip a leading "v" and return a semver-ish string, or null if unusable.
 * @param {string|null|undefined} tag
 * @returns {string|null}
 */
function normalizeVersionTag(tag) {
  if (tag == null) return null;
  const s = String(tag).trim();
  if (!s) return null;
  const withoutV = s.startsWith('v') || s.startsWith('V') ? s.slice(1) : s;
  // Accept release tags like 0.1.15 or 0.1.15-pr.3
  if (!/^\d+\.\d+\.\d+/.test(withoutV)) return null;
  return withoutV;
}

/**
 * Compare two dotted version prefixes (major.minor.patch). Prerelease suffixes
 * after the numeric triple are ignored for ordering (0.1.15-pr.3 ≈ 0.1.15).
 * @returns {number} negative if a<b, 0 if equal, positive if a>b
 */
function compareSemverCore(a, b) {
  const na = normalizeVersionTag(a);
  const nb = normalizeVersionTag(b);
  if (na == null || nb == null) return 0;
  const pa = na.split(/[-+]/)[0].split('.').map((n) => parseInt(n, 10) || 0);
  const pb = nb.split(/[-+]/)[0].split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da !== db) return da - db;
  }
  return 0;
}

function isNewerVersion(remoteTag, currentVersion) {
  return compareSemverCore(remoteTag, currentVersion) > 0;
}

/**
 * @param {string} platform process.platform
 * @returns {'install'|'alert'}
 */
function updateModeForPlatform(platform) {
  if (platform === 'darwin') return 'alert';
  return 'install';
}

/**
 * @param {{ currentVersion: string, remoteVersion: string, mode: 'install'|'alert' }} opts
 */
function buildUpdateAvailableDialog(opts) {
  const { currentVersion, remoteVersion, mode } = opts;
  if (mode === 'alert') {
    return {
      type: 'info',
      title: 'New version available',
      message: `Poster ${remoteVersion} is available (you have ${currentVersion}).`,
      detail:
        'macOS builds are not signed yet, so the app cannot install updates automatically. Open the download page to get the new DMG. After installing, clear quarantine if Gatekeeper blocks launch (see docs/macos-install-unsigned.txt).',
      buttons: ['Open download page', 'Later'],
      defaultId: 0,
      cancelId: 1,
      openDownloadPageResponse: 0,
    };
  }
  return {
    type: 'info',
    title: 'New version available',
    message: `Poster ${remoteVersion} is available (you have ${currentVersion}).`,
    detail: 'Download and install over the current version? The app will restart when ready.',
    buttons: ['Download and install', 'Later'],
    defaultId: 0,
    cancelId: 1,
    downloadResponse: 0,
  };
}

/**
 * @param {{ remoteVersion: string }} opts
 */
function buildUpdateDownloadedDialog(opts) {
  return {
    type: 'info',
    title: 'Update ready',
    message: `Poster ${opts.remoteVersion} has been downloaded.`,
    detail: 'Restart now to install the update?',
    buttons: ['Restart and install', 'Later'],
    defaultId: 0,
    cancelId: 1,
    restartResponse: 0,
  };
}

function releasesLatestUrl() {
  return DEFAULT_RELEASES_LATEST_URL;
}

function githubApiLatestUrl() {
  return DEFAULT_GITHUB_API_LATEST;
}

/**
 * Parse GitHub /releases/latest JSON for a comparable tag.
 * @param {object} releaseJson
 * @returns {{ version: string, htmlUrl: string }|null}
 */
function parseGithubLatestRelease(releaseJson) {
  if (!releaseJson || typeof releaseJson !== 'object') return null;
  const version = normalizeVersionTag(releaseJson.tag_name);
  if (!version) return null;
  const htmlUrl =
    typeof releaseJson.html_url === 'string' && releaseJson.html_url
      ? releaseJson.html_url
      : DEFAULT_RELEASES_LATEST_URL;
  return { version, htmlUrl };
}

module.exports = {
  normalizeVersionTag,
  compareSemverCore,
  isNewerVersion,
  updateModeForPlatform,
  buildUpdateAvailableDialog,
  buildUpdateDownloadedDialog,
  releasesLatestUrl,
  githubApiLatestUrl,
  parseGithubLatestRelease,
  DEFAULT_RELEASES_LATEST_URL,
  DEFAULT_GITHUB_API_LATEST,
};
