'use strict';

const {
  isPresentHydrated,
  shouldReloadForStuckSsr,
  attachPresentHydrateWatchdog,
  DEFAULT_CLIENT_BOOT_GRACE_MS,
  PRESENT_HYDRATE_DOM_SCRIPT,
} = require('../adapters/electron/presentHydrateWatchdog.cjs');

describe('presentHydrateWatchdog (REQ-010)', () => {
  describe('isPresentHydrated', () => {
    it('is false for SSR Loading without client boot', () => {
      expect(
        isPresentHydrated({
          loading: true,
          ready: false,
          sessionError: false,
          clientBoot: false,
        }),
      ).toBe(false);
    });

    it('is true when present-ready is visible', () => {
      expect(
        isPresentHydrated({
          loading: false,
          ready: true,
          sessionError: false,
          clientBoot: true,
        }),
      ).toBe(true);
    });

    it('is true on present-session-error (left Loading)', () => {
      expect(
        isPresentHydrated({
          loading: false,
          ready: false,
          sessionError: true,
          clientBoot: true,
        }),
      ).toBe(true);
    });

    it('is true when clientBoot cleared loading without ready testid', () => {
      expect(
        isPresentHydrated({
          loading: false,
          ready: false,
          sessionError: false,
          clientBoot: true,
        }),
      ).toBe(true);
    });
  });

  describe('shouldReloadForStuckSsr', () => {
    const base = {
      hydrated: false,
      clientBoot: false,
      alreadyReloaded: false,
      destroyed: false,
      elapsedMs: DEFAULT_CLIENT_BOOT_GRACE_MS,
      clientBootGraceMs: DEFAULT_CLIENT_BOOT_GRACE_MS,
    };

    it('reloads once when grace elapsed and client never booted (real presentId URL path)', () => {
      expect(shouldReloadForStuckSsr(base)).toBe(true);
    });

    it('does not reload before grace', () => {
      expect(shouldReloadForStuckSsr({ ...base, elapsedMs: graceMsHalf() })).toBe(false);
    });

    it('does not reload when client already booted (session hang ≠ SSR stuck)', () => {
      expect(shouldReloadForStuckSsr({ ...base, clientBoot: true })).toBe(false);
    });

    it('does not reload a second time', () => {
      expect(shouldReloadForStuckSsr({ ...base, alreadyReloaded: true })).toBe(false);
    });

    it('does not reload when already hydrated or destroyed', () => {
      expect(shouldReloadForStuckSsr({ ...base, hydrated: true })).toBe(false);
      expect(shouldReloadForStuckSsr({ ...base, destroyed: true })).toBe(false);
    });

    function graceMsHalf() {
      return Math.floor(DEFAULT_CLIENT_BOOT_GRACE_MS / 2);
    }
  });

  describe('attachPresentHydrateWatchdog', () => {
    function createFakeWebContents() {
      const listeners = new Map();
      const destroyedListeners = [];
      let destroyed = false;
      let state = {
        loading: true,
        ready: false,
        sessionError: false,
        clientBoot: false,
      };
      const wc = {
        isDestroyed: () => destroyed,
        executeJavaScript: jest.fn(async () => ({ ...state })),
        reload: jest.fn(),
        on: jest.fn((event, fn) => {
          if (event === 'did-finish-load') {
            const list = listeners.get(event) || [];
            list.push(fn);
            listeners.set(event, list);
          }
        }),
        once: jest.fn((event, fn) => {
          if (event === 'destroyed') destroyedListeners.push(fn);
        }),
        removeListener: jest.fn((event, fn) => {
          const list = listeners.get(event) || [];
          listeners.set(
            event,
            list.filter((x) => x !== fn),
          );
        }),
        emitDidFinishLoad() {
          for (const fn of listeners.get('did-finish-load') || []) fn();
        },
        setState(next) {
          state = { ...state, ...next };
        },
        destroy() {
          destroyed = true;
          for (const fn of destroyedListeners) fn();
        },
      };
      return wc;
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    it('reloads once when stuck on SSR Loading with no client boot (presentId URL)', async () => {
      const wc = createFakeWebContents();
      const reload = jest.fn(() => {
        // Simulate reload finishing with client boot + ready.
        wc.setState({
          loading: false,
          ready: true,
          sessionError: false,
          clientBoot: true,
        });
        wc.emitDidFinishLoad();
      });
      const handle = attachPresentHydrateWatchdog(wc, {
        clientBootGraceMs: 80,
        pollMs: 20,
        reload,
      });

      wc.emitDidFinishLoad();
      expect(reload).not.toHaveBeenCalled();

      await sleep(150);
      expect(reload).toHaveBeenCalledTimes(1);

      await sleep(120);
      expect(reload).toHaveBeenCalledTimes(1);
      handle.stop();
    });

    it('does not reload when present-ready appears before grace', async () => {
      const wc = createFakeWebContents();
      const reload = jest.fn();
      const handle = attachPresentHydrateWatchdog(wc, {
        clientBootGraceMs: 80,
        pollMs: 20,
        reload,
      });
      wc.emitDidFinishLoad();
      wc.setState({
        loading: false,
        ready: true,
        sessionError: false,
        clientBoot: true,
      });
      await sleep(150);
      expect(reload).not.toHaveBeenCalled();
      handle.stop();
    });

    it('exposes DOM probe script that reads present-ready and client boot', () => {
      expect(PRESENT_HYDRATE_DOM_SCRIPT).toMatch(/present-ready/);
      expect(PRESENT_HYDRATE_DOM_SCRIPT).toMatch(/present-loading/);
      expect(PRESENT_HYDRATE_DOM_SCRIPT).toMatch(/__posterPresentClientBoot/);
    });
  });
});
