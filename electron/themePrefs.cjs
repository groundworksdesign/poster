'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const VALID_THEMES = new Set(['light', 'dracula', 'tokyo-night', 'dark-blue', 'github-dark']);
const DEFAULT_THEME = 'light';

function resolvePosterHome(env = process.env, homeDir = os.homedir()) {
  if (env.POSTER_HOME) return path.resolve(env.POSTER_HOME);
  return path.join(homeDir, '.poster');
}

function resolveThemePrefsPath(env = process.env, homeDir = os.homedir()) {
  return path.join(resolvePosterHome(env, homeDir), 'theme.json');
}

function validateTheme(theme) {
  return typeof theme === 'string' && VALID_THEMES.has(theme) ? theme : DEFAULT_THEME;
}

function readThemePrefs(options = {}) {
  const filePath = options.filePath || resolveThemePrefsPath(options.env, options.homeDir);
  try {
    if (!fs.existsSync(filePath)) return DEFAULT_THEME;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const value = typeof parsed === 'string' ? parsed : parsed && parsed.theme;
    return validateTheme(value);
  } catch {
    return DEFAULT_THEME;
  }
}

function writeThemePrefs(theme, options = {}) {
  const safeTheme = validateTheme(theme);
  const filePath = options.filePath || resolveThemePrefsPath(options.env, options.homeDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ theme: safeTheme }, null, 2));
  return safeTheme;
}

module.exports = {
  DEFAULT_THEME,
  VALID_THEMES,
  resolvePosterHome,
  resolveThemePrefsPath,
  validateTheme,
  readThemePrefs,
  writeThemePrefs,
};
