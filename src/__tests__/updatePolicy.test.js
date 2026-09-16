'use strict';

const {
  normalizeVersionTag,
  compareSemverCore,
  isNewerVersion,
  updateModeForPlatform,
  buildUpdateAvailableDialog,
  buildUpdateDownloadedDialog,
  parseGithubLatestRelease,
  releasesLatestUrl,
} = require('../adapters/electron/updatePolicy.cjs');

describe('updatePolicy', () => {
  describe('normalizeVersionTag', () => {
    it('strips leading v', () => {
      expect(normalizeVersionTag('v0.1.15')).toBe('0.1.15');
      expect(normalizeVersionTag('V1.2.3')).toBe('1.2.3');
    });

    it('keeps prerelease suffixes', () => {
      expect(normalizeVersionTag('v0.1.15-pr.3')).toBe('0.1.15-pr.3');
    });

    it('returns null for empty or non-semver', () => {
      expect(normalizeVersionTag('')).toBeNull();
      expect(normalizeVersionTag(null)).toBeNull();
      expect(normalizeVersionTag('latest')).toBeNull();
    });
  });

  describe('compareSemverCore / isNewerVersion', () => {
    it('orders numeric triples', () => {
      expect(compareSemverCore('0.1.14', '0.1.15')).toBeLessThan(0);
      expect(compareSemverCore('0.2.0', '0.1.99')).toBeGreaterThan(0);
      expect(compareSemverCore('v0.1.15', '0.1.15')).toBe(0);
    });

    it('treats prerelease core equal to the numeric triple', () => {
      expect(isNewerVersion('0.1.15-pr.3', '0.1.15')).toBe(false);
      expect(isNewerVersion('0.1.16-pr.1', '0.1.15')).toBe(true);
    });

    it('detects newer remote tags', () => {
      expect(isNewerVersion('v0.1.16', '0.1.15')).toBe(true);
      expect(isNewerVersion('0.1.15', '0.1.15')).toBe(false);
      expect(isNewerVersion('0.1.14', '0.1.15')).toBe(false);
    });
  });

  describe('updateModeForPlatform', () => {
    it('alerts on macOS and installs elsewhere', () => {
      expect(updateModeForPlatform('darwin')).toBe('alert');
      expect(updateModeForPlatform('win32')).toBe('install');
      expect(updateModeForPlatform('linux')).toBe('install');
    });
  });

  describe('dialogs', () => {
    it('builds Mac alert dialog with Open download page', () => {
      const dlg = buildUpdateAvailableDialog({
        currentVersion: '0.1.15',
        remoteVersion: '0.1.16',
        mode: 'alert',
      });
      expect(dlg.buttons[0]).toMatch(/Open download page/i);
      expect(dlg.buttons).toContain('Later');
      expect(dlg.openDownloadPageResponse).toBe(0);
      expect(dlg.detail).toMatch(/not signed/i);
    });

    it('builds Win/Linux install dialog', () => {
      const dlg = buildUpdateAvailableDialog({
        currentVersion: '0.1.15',
        remoteVersion: '0.1.16',
        mode: 'install',
      });
      expect(dlg.buttons[0]).toMatch(/Download and install/i);
      expect(dlg.downloadResponse).toBe(0);
    });

    it('builds restart dialog after download', () => {
      const dlg = buildUpdateDownloadedDialog({ remoteVersion: '0.1.16' });
      expect(dlg.buttons[0]).toMatch(/Restart/i);
      expect(dlg.restartResponse).toBe(0);
    });
  });

  describe('parseGithubLatestRelease', () => {
    it('reads tag_name and html_url', () => {
      const parsed = parseGithubLatestRelease({
        tag_name: 'v0.1.16',
        html_url: 'https://github.com/groundworksdesign/poster/releases/tag/v0.1.16',
      });
      expect(parsed).toEqual({
        version: '0.1.16',
        htmlUrl: 'https://github.com/groundworksdesign/poster/releases/tag/v0.1.16',
      });
    });

    it('falls back to releases/latest url', () => {
      const parsed = parseGithubLatestRelease({ tag_name: '0.2.0' });
      expect(parsed.version).toBe('0.2.0');
      expect(parsed.htmlUrl).toBe(releasesLatestUrl());
    });

    it('returns null for bad payloads', () => {
      expect(parseGithubLatestRelease(null)).toBeNull();
      expect(parseGithubLatestRelease({ tag_name: 'nope' })).toBeNull();
    });
  });
});
