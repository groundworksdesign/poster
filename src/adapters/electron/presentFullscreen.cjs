'use strict';

/**
 * Present window fullscreen helpers for Electron (Mac-first).
 * Prefer native setFullScreen; fall back to setSimpleFullScreen when native
 * fails or the menu bar still appears to consume display space (darwin).
 * One mode at a time — never stack HTML fullscreen with these APIs.
 */

/**
 * @typedef {'native' | 'simple' | 'windowed'} PresentFullscreenMode
 * @typedef {{
 *   ok: boolean,
 *   mode: PresentFullscreenMode,
 *   fallback: boolean,
 *   reason?: string,
 * }} PresentFullscreenResult
 */

/**
 * @param {object} win Electron BrowserWindow-like
 * @returns {PresentFullscreenMode}
 */
function getPresentFullscreenMode(win) {
  if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
    return 'windowed';
  }
  if (typeof win.isSimpleFullScreen === 'function' && win.isSimpleFullScreen()) {
    return 'simple';
  }
  if (typeof win.isFullScreen === 'function' && win.isFullScreen()) {
    return 'native';
  }
  return 'windowed';
}

/**
 * Heuristic: after native FS, if the window height still matches the display
 * work area (not full bounds), the menu bar is likely still visible.
 * @param {object} win
 * @param {object | null} display Electron Display-like ({ bounds, workArea })
 * @param {string} platform
 */
function menuBarLikelyVisible(win, display, platform) {
  if (platform !== 'darwin' || !win || !display) return false;
  const bounds = typeof win.getBounds === 'function' ? win.getBounds() : null;
  if (!bounds || !display.bounds || !display.workArea) return false;
  const fullH = display.bounds.height;
  const workH = display.workArea.height;
  if (!(fullH > workH)) return false;
  // Window still sized like the work area → menu bar chrome still claiming space.
  return bounds.height <= workH + 1;
}

/**
 * Exit whichever fullscreen mode is active.
 * @param {object} win
 * @returns {PresentFullscreenResult}
 */
function exitPresentFullscreen(win) {
  if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
    return { ok: false, mode: 'windowed', fallback: false, reason: 'no-window' };
  }
  try {
    if (typeof win.isSimpleFullScreen === 'function' && win.isSimpleFullScreen()) {
      win.setSimpleFullScreen(false);
    }
  } catch (_) {
    // continue clearing native
  }
  try {
    if (typeof win.isFullScreen === 'function' && win.isFullScreen()) {
      win.setFullScreen(false);
    }
  } catch (_) {
    // best-effort
  }
  return { ok: true, mode: 'windowed', fallback: false };
}

/**
 * Enter fullscreen on the given window.
 * @param {object} win
 * @param {{
 *   platform?: string,
 *   getDisplay?: (w: object) => object | null,
 *   forceSimple?: boolean,
 * }} [opts]
 * @returns {PresentFullscreenResult}
 */
function enterPresentFullscreen(win, opts = {}) {
  if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
    return { ok: false, mode: 'windowed', fallback: false, reason: 'no-window' };
  }

  const platform = opts.platform || process.platform;
  const current = getPresentFullscreenMode(win);
  if (current !== 'windowed') {
    return { ok: true, mode: current, fallback: current === 'simple' };
  }

  if (opts.forceSimple) {
    return applySimpleFullscreen(win, 'forced-simple');
  }

  let nativeOk = false;
  try {
    if (typeof win.setFullScreen === 'function') {
      win.setFullScreen(true);
      nativeOk = typeof win.isFullScreen === 'function' ? win.isFullScreen() : true;
    }
  } catch (_) {
    nativeOk = false;
  }

  if (!nativeOk) {
    return applySimpleFullscreen(win, 'native-failed');
  }

  const display =
    typeof opts.getDisplay === 'function' ? opts.getDisplay(win) : null;
  if (menuBarLikelyVisible(win, display, platform)) {
    // Prefer one mode: leave native Spaces FS before simple FS.
    try {
      win.setFullScreen(false);
    } catch (_) {
      // continue
    }
    return applySimpleFullscreen(win, 'menu-bar-visible');
  }

  return { ok: true, mode: 'native', fallback: false };
}

/**
 * @param {object} win
 * @param {string} reason
 * @returns {PresentFullscreenResult}
 */
function applySimpleFullscreen(win, reason) {
  if (typeof win.setSimpleFullScreen !== 'function') {
    return {
      ok: false,
      mode: getPresentFullscreenMode(win),
      fallback: false,
      reason: `${reason}:simple-unavailable`,
    };
  }
  try {
    win.setSimpleFullScreen(true);
    const ok =
      typeof win.isSimpleFullScreen === 'function' ? win.isSimpleFullScreen() : true;
    return {
      ok,
      mode: ok ? 'simple' : getPresentFullscreenMode(win),
      fallback: ok,
      reason,
    };
  } catch (err) {
    return {
      ok: false,
      mode: getPresentFullscreenMode(win),
      fallback: false,
      reason: `${reason}:${err && err.message ? err.message : 'error'}`,
    };
  }
}

/**
 * Toggle fullscreen for the sender window.
 * @param {object} win
 * @param {object} [opts]
 * @returns {PresentFullscreenResult}
 */
function togglePresentFullscreen(win, opts = {}) {
  const mode = getPresentFullscreenMode(win);
  if (mode !== 'windowed') {
    return exitPresentFullscreen(win);
  }
  return enterPresentFullscreen(win, opts);
}

module.exports = {
  getPresentFullscreenMode,
  menuBarLikelyVisible,
  enterPresentFullscreen,
  exitPresentFullscreen,
  togglePresentFullscreen,
};

// pr-build tip 20260926T141007Z
