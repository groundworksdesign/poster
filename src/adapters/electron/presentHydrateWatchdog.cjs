'use strict';

/**
 * REQ-010: Main-owned present-session loadURL can leave Remix SSR "Loading..."
 * forever under AppImage/FUSE when preload + presentId URL are already correct
 * but the Remix client never boots. Poll the Present DOM after did-finish-load;
 * if client JS never marks boot / present-ready, reload once.
 */

/** Grace before treating missing client boot as stuck SSR (ms). */
const DEFAULT_CLIENT_BOOT_GRACE_MS = 6000;
/** Poll interval while waiting for hydrate (ms). */
const DEFAULT_POLL_MS = 250;

/**
 * DOM snapshot from Present after loadURL (executeJavaScript).
 * @typedef {{ loading?: boolean, ready?: boolean, sessionError?: boolean, clientBoot?: boolean }} PresentHydrateDomState
 */

/**
 * True when Present has left SSR Loading (ready or explicit session error).
 * @param {PresentHydrateDomState | null | undefined} state
 * @returns {boolean}
 */
function isPresentHydrated(state) {
  if (!state || typeof state !== 'object') return false;
  if (state.ready || state.sessionError) return true;
  // Client ran and cleared loading without the ready testid (defensive).
  if (state.clientBoot && state.loading === false) return true;
  return false;
}

/**
 * Whether main should reload once for stuck SSR (no client boot yet).
 * @param {{ hydrated: boolean, clientBoot: boolean, alreadyReloaded: boolean, destroyed?: boolean, elapsedMs: number, clientBootGraceMs?: number }} args
 * @returns {boolean}
 */
function shouldReloadForStuckSsr(args) {
  const grace = args.clientBootGraceMs ?? DEFAULT_CLIENT_BOOT_GRACE_MS;
  if (args.destroyed || args.alreadyReloaded || args.hydrated) return false;
  if (args.clientBoot) return false; // JS ran; reload will not fix a session hang
  return args.elapsedMs >= grace;
}

/**
 * Script evaluated in the Present webContents to read hydrate markers.
 * Kept as a string so main and unit tests share one source of truth.
 */
const PRESENT_HYDRATE_DOM_SCRIPT = `(() => {
  try {
    return {
      loading: !!document.querySelector('[data-testid="present-loading"]'),
      ready: !!document.querySelector('[data-testid="present-ready"]'),
      sessionError: !!document.querySelector('[data-testid="present-session-error"]'),
      clientBoot: !!(typeof window !== 'undefined' && window.__posterPresentClientBoot),
    };
  } catch (e) {
    return { loading: true, ready: false, sessionError: false, clientBoot: false };
  }
})()`;

/**
 * Attach a one-reload hydrate watchdog to a present-session BrowserWindow webContents.
 * @param {Electron.WebContents} webContents
 * @param {{ clientBootGraceMs?: number, pollMs?: number, reload?: () => void }} [opts]
 * @returns {{ stop: () => void }}
 */
function attachPresentHydrateWatchdog(webContents, opts = {}) {
  const clientBootGraceMs = opts.clientBootGraceMs ?? DEFAULT_CLIENT_BOOT_GRACE_MS;
  const pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
  const reloadFn =
    typeof opts.reload === 'function'
      ? opts.reload
      : () => {
          if (!webContents.isDestroyed()) webContents.reload();
        };

  let stopped = false;
  let alreadyReloaded = false;
  let pollTimer = null;
  let loadGeneration = 0;
  let loadStartedAt = 0;

  const clearPoll = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const stop = () => {
    stopped = true;
    clearPoll();
    try {
      webContents.removeListener('did-finish-load', onDidFinishLoad);
    } catch {
      /* ignore */
    }
  };

  const startPollForLoad = (generation) => {
    clearPoll();
    loadStartedAt = Date.now();
    pollTimer = setInterval(() => {
      void (async () => {
        if (stopped || generation !== loadGeneration) return;
        if (webContents.isDestroyed()) {
          stop();
          return;
        }
        let state;
        try {
          state = await webContents.executeJavaScript(PRESENT_HYDRATE_DOM_SCRIPT, true);
        } catch {
          // Navigation / reload in flight — wait for next tick.
          return;
        }
        if (stopped || generation !== loadGeneration) return;

        if (isPresentHydrated(state)) {
          stop();
          return;
        }

        const elapsedMs = Date.now() - loadStartedAt;
        if (
          shouldReloadForStuckSsr({
            hydrated: false,
            clientBoot: Boolean(state && state.clientBoot),
            alreadyReloaded,
            destroyed: webContents.isDestroyed(),
            elapsedMs,
            clientBootGraceMs,
          })
        ) {
          alreadyReloaded = true;
          clearPoll();
          try {
            reloadFn();
          } catch {
            stop();
          }
          // Next did-finish-load restarts polling; alreadyReloaded blocks a second reload.
        }
      })();
    }, pollMs);
  };

  function onDidFinishLoad() {
    if (stopped || webContents.isDestroyed()) return;
    loadGeneration += 1;
    startPollForLoad(loadGeneration);
  }

  webContents.on('did-finish-load', onDidFinishLoad);
  webContents.once('destroyed', stop);

  return { stop };
}

module.exports = {
  DEFAULT_CLIENT_BOOT_GRACE_MS,
  DEFAULT_POLL_MS,
  PRESENT_HYDRATE_DOM_SCRIPT,
  isPresentHydrated,
  shouldReloadForStuckSsr,
  attachPresentHydrateWatchdog,
};
