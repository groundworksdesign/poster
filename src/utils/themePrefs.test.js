'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  resolvePosterHome,
  resolveThemePrefsPath,
  readThemePrefs,
  writeThemePrefs,
} = require('../../electron/themePrefs.cjs');

describe('theme preference store', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-theme-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('resolves the default preference path under the user home', () => {
    expect(resolvePosterHome({}, root)).toBe(path.join(root, '.poster'));
    expect(resolveThemePrefsPath({}, root)).toBe(path.join(root, '.poster', 'theme.json'));
    expect(resolvePosterHome({ POSTER_HOME: path.join(root, 'custom') }, root)).toBe(
      path.join(root, 'custom'),
    );
  });

  it('round-trips valid themes in theme.json', () => {
    expect(writeThemePrefs('tokyo-night', { env: {}, homeDir: root })).toBe('tokyo-night');
    expect(readThemePrefs({ env: {}, homeDir: root })).toBe('tokyo-night');
    expect(JSON.parse(fs.readFileSync(path.join(root, '.poster', 'theme.json'), 'utf8'))).toEqual({
      theme: 'tokyo-night',
    });
  });

  it('falls back safely for missing, malformed, and invalid values', () => {
    expect(readThemePrefs({ env: {}, homeDir: root })).toBe('light');
    const filePath = path.join(root, '.poster', 'theme.json');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '{not json');
    expect(readThemePrefs({ filePath })).toBe('light');
    fs.writeFileSync(filePath, JSON.stringify({ theme: 'not-a-theme' }));
    expect(readThemePrefs({ filePath })).toBe('light');
    expect(writeThemePrefs('not-a-theme', { filePath })).toBe('light');
  });
});
