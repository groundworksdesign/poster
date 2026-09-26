'use strict';

const {
  getPresentFullscreenMode,
  menuBarLikelyVisible,
  enterPresentFullscreen,
  exitPresentFullscreen,
  togglePresentFullscreen,
} = require('../adapters/electron/presentFullscreen.cjs');

function mockWin(initial = {}) {
  let fullScreen = !!initial.fullScreen;
  let simpleFullScreen = !!initial.simpleFullScreen;
  let bounds = initial.bounds || { x: 0, y: 0, width: 1280, height: 800 };
  return {
    isDestroyed: () => false,
    isFullScreen: () => fullScreen,
    isSimpleFullScreen: () => simpleFullScreen,
    getBounds: () => bounds,
    setFullScreen: (flag) => {
      if (initial.failNative) {
        throw new Error('native-fs-failed');
      }
      fullScreen = !!flag;
      if (flag && initial.afterNativeBounds) {
        bounds = { ...initial.afterNativeBounds };
      }
    },
    setSimpleFullScreen: (flag) => {
      if (initial.failSimple) {
        throw new Error('simple-fs-failed');
      }
      simpleFullScreen = !!flag;
      if (flag) {
        fullScreen = false;
      }
    },
    _state: () => ({ fullScreen, simpleFullScreen, bounds }),
  };
}

describe('presentFullscreen helpers', () => {
  it('reports windowed when neither mode is active', () => {
    expect(getPresentFullscreenMode(mockWin())).toBe('windowed');
  });

  it('enters native fullscreen when setFullScreen succeeds', () => {
    const win = mockWin();
    const result = enterPresentFullscreen(win, {
      platform: 'darwin',
      getDisplay: () => ({
        bounds: { height: 900, width: 1440 },
        workArea: { height: 900, width: 1440 },
      }),
    });
    expect(result).toEqual({ ok: true, mode: 'native', fallback: false });
    expect(win.isFullScreen()).toBe(true);
    expect(win.isSimpleFullScreen()).toBe(false);
  });

  it('falls back to simple when native setFullScreen fails', () => {
    const win = mockWin({ failNative: true });
    const result = enterPresentFullscreen(win, { platform: 'darwin' });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('simple');
    expect(result.fallback).toBe(true);
    expect(result.reason).toBe('native-failed');
    expect(win.isSimpleFullScreen()).toBe(true);
    expect(win.isFullScreen()).toBe(false);
  });

  it('falls back to simple when menu bar likely still visible after native', () => {
    const win = mockWin({
      afterNativeBounds: { x: 0, y: 25, width: 1440, height: 875 },
    });
    const result = enterPresentFullscreen(win, {
      platform: 'darwin',
      getDisplay: () => ({
        bounds: { height: 900, width: 1440 },
        workArea: { height: 875, width: 1440 },
      }),
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('simple');
    expect(result.fallback).toBe(true);
    expect(result.reason).toBe('menu-bar-visible');
    expect(win.isSimpleFullScreen()).toBe(true);
    expect(win.isFullScreen()).toBe(false);
  });

  it('does not treat non-darwin workArea gap as menu-bar fallback', () => {
    const win = mockWin({
      afterNativeBounds: { x: 0, y: 0, width: 1440, height: 875 },
    });
    const result = enterPresentFullscreen(win, {
      platform: 'linux',
      getDisplay: () => ({
        bounds: { height: 900, width: 1440 },
        workArea: { height: 875, width: 1440 },
      }),
    });
    expect(result.mode).toBe('native');
    expect(result.fallback).toBe(false);
  });

  it('menuBarLikelyVisible is false without a workArea gap', () => {
    const win = mockWin({ bounds: { x: 0, y: 0, width: 1440, height: 900 } });
    expect(
      menuBarLikelyVisible(
        win,
        { bounds: { height: 900 }, workArea: { height: 900 } },
        'darwin',
      ),
    ).toBe(false);
  });

  it('exit clears both native and simple modes', () => {
    const win = mockWin({ fullScreen: true, simpleFullScreen: true });
    const result = exitPresentFullscreen(win);
    expect(result).toEqual({ ok: true, mode: 'windowed', fallback: false });
    expect(win.isFullScreen()).toBe(false);
    expect(win.isSimpleFullScreen()).toBe(false);
  });

  it('toggle enters then exits', () => {
    const win = mockWin();
    const enter = togglePresentFullscreen(win, {
      platform: 'darwin',
      getDisplay: () => ({
        bounds: { height: 900, width: 1440 },
        workArea: { height: 900, width: 1440 },
      }),
    });
    expect(enter.mode).toBe('native');
    const exit = togglePresentFullscreen(win);
    expect(exit.mode).toBe('windowed');
    expect(win.isFullScreen()).toBe(false);
  });

  it('forceSimple skips native and uses setSimpleFullScreen', () => {
    const win = mockWin();
    const result = enterPresentFullscreen(win, { forceSimple: true });
    expect(result.mode).toBe('simple');
    expect(win.isSimpleFullScreen()).toBe(true);
    expect(win.isFullScreen()).toBe(false);
  });

  it('returns no-window when win is missing', () => {
    expect(enterPresentFullscreen(null)).toMatchObject({
      ok: false,
      mode: 'windowed',
      reason: 'no-window',
    });
  });
});
