'use strict';

/**
 * Pure helpers for single-Home window policy (Electron + tests).
 * Home is the saved-deck Library at `/`. Deck builders are `/deck`.
 * Present play surfaces require session query params.
 */

/**
 * @param {string} urlString
 * @returns {{ pathname: string, searchParams: URLSearchParams }}
 */
function parseAppUrl(urlString) {
  try {
    const u = new URL(urlString, 'http://127.0.0.1');
    return { pathname: u.pathname || '/', searchParams: u.searchParams };
  } catch {
    return { pathname: '/', searchParams: new URLSearchParams() };
  }
}

/**
 * Classify a target URL for window.open / new BrowserWindow.
 * @param {string} urlString
 * @returns {'home' | 'deck' | 'present-session' | 'present-bare' | 'present-blank' | 'other'}
 */
function classifyOpenUrl(urlString) {
  // about:blank is still classified for browser/Remix popup gesture opens.
  // Packaged Electron Deck skips about:blank and opens the absolute Present URL
  // (see openPresentWindow.openPresentForRuntime). main.cjs owns that
  // present-session BrowserWindow via loadURL (deny Chromium popup allow) so
  // cold AppImage open gets preload + Remix hydrate — not SSR Loading forever.
  const trimmed = String(urlString || '').trim().toLowerCase();
  if (trimmed === 'about:blank' || trimmed.startsWith('about:blank?')) {
    return 'present-blank';
  }

  const { pathname, searchParams } = parseAppUrl(urlString);
  const path = pathname.replace(/\/+$/, '') || '/';

  if (path === '/' || path === '') {
    return 'home';
  }
  if (path === '/deck' || path.startsWith('/deck/')) {
    return 'deck';
  }
  if (path === '/presentation' || path.startsWith('/presentation/')) {
    const sessionId = searchParams.get('sessionId');
    const presentId = searchParams.get('presentId');
    if (sessionId && presentId) {
      return 'present-session';
    }
    return 'present-bare';
  }
  return 'other';
}

/**
 * Whether a new Home BrowserWindow should be created.
 * @param {{ exists: boolean, destroyed?: boolean }} mainHome
 * @returns {boolean} true = create; false = focus existing only
 */
function shouldCreateHomeWindow(mainHome) {
  if (!mainHome || !mainHome.exists || mainHome.destroyed) {
    return true;
  }
  return false;
}

module.exports = {
  parseAppUrl,
  classifyOpenUrl,
  shouldCreateHomeWindow,
};
