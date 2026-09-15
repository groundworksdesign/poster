/**
 * Present window open helpers.
 *
 * Browser: open about:blank in the click turn (keeps the popup gesture), then
 * navigate to an absolute Present URL after spawn.
 *
 * Packaged Electron/AppImage: do NOT use about:blank. Chromium's about:blank
 * popup path + later location.assign can leave SSR HTML ("Loading...") with no
 * Remix client hydrate on first open; a manual reload then works. Electron does
 * not need the browser gesture — open the absolute Present URL directly. Main
 * then owns that present-session BrowserWindow (loadURL, not Chromium allow)
 * so cold AppImage open always gets preload + a normal document load.
 */

export const PRESENT_OPEN_FEATURES =
  'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes';

export type PosterBridgeWindow = {
  poster?: unknown;
  navigator?: { userAgent?: string };
};

/** True when the Electron preload bridge is present (packaged or `electron .`). */
export function hasPosterBridge(
  win: PosterBridgeWindow = typeof window !== 'undefined' ? window : {},
): boolean {
  return !!win.poster;
}

/**
 * True when the runtime looks like Electron (renderer userAgent includes "Electron").
 * Used to decide whether a late preload wait is appropriate — browsers must open
 * about:blank in the click turn (popup gesture); Electron does not need that gesture.
 */
export function isElectronUserAgent(
  win: PosterBridgeWindow = typeof window !== 'undefined' ? window : {},
): boolean {
  const ua =
    win.navigator?.userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return /Electron/i.test(ua);
}

/**
 * Wait briefly for Electron preload (`window.poster`) before choosing Present open mode.
 * AppImage/FUSE can delay first preload inject after heavy FileReader import I/O; falling
 * through to about:blank immediately recreates the SSR Loading hang on cold Open Present.
 */
export async function waitForPosterBridge(
  win: PosterBridgeWindow = typeof window !== 'undefined' ? window : {},
  opts: {
    timeoutMs?: number;
    intervalMs?: number;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<boolean> {
  if (hasPosterBridge(win)) return true;
  const timeoutMs = opts.timeoutMs ?? 2000;
  const intervalMs = opts.intervalMs ?? 50;
  const now = opts.now ?? Date.now;
  const sleep =
    opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    await sleep(intervalMs);
    if (hasPosterBridge(win)) return true;
  }
  return hasPosterBridge(win);
}

/** Resolve spawn URL against the deck origin (required after about:blank). */
export function toAbsolutePresentUrl(url: string, origin: string): string {
  return new URL(url, origin).href;
}

/**
 * Navigate a gesture-opened blank window to Present, or open Present directly.
 * Returns the window used for navigation (may be null if the popup was blocked).
 */
export function navigatePresentAfterSpawn(
  blankWindow: Window | null,
  presentUrl: string,
  origin: string,
  open: typeof window.open = (...args) => window.open(...args),
  features: string = PRESENT_OPEN_FEATURES,
): Window | null {
  const absoluteUrl = toAbsolutePresentUrl(presentUrl, origin);
  if (blankWindow && !blankWindow.closed) {
    try {
      blankWindow.opener = null;
    } catch {
      // Cross-origin / sealed WindowProxy — continue navigating.
    }
    blankWindow.location.href = absoluteUrl;
    try {
      blankWindow.focus();
    } catch {
      // focus can throw on some sealed proxies
    }
    return blankWindow;
  }
  return open(absoluteUrl, '_blank', features);
}

export type OpenPresentPlan =
  | { mode: 'electron-direct' }
  | { mode: 'browser-gesture-blank' };

/** Choose Present open strategy from the runtime bridge. */
export function planPresentOpen(
  win: PosterBridgeWindow = typeof window !== 'undefined' ? window : {},
): OpenPresentPlan {
  return hasPosterBridge(win) ? { mode: 'electron-direct' } : { mode: 'browser-gesture-blank' };
}

/**
 * Open Present for the current runtime.
 * Electron: spawn first, then window.open(absolute Present URL) — no about:blank.
 * Browser: about:blank in the click turn, then absolute navigate after spawn.
 *
 * Late-preload wait runs only on Electron UAs (AppImage/FUSE after FileReader import).
 * Browsers/jsdom must not await before about:blank — that loses the popup gesture and
 * hangs DeckBuilder unit Open Present (browser) for the full bridge timeout.
 */
export async function openPresentForRuntime(opts: {
  spawnPresent: () => Promise<{ url: string; presentId: string }>;
  origin: string;
  open?: typeof window.open;
  features?: string;
  bridgeWindow?: PosterBridgeWindow;
  bridgeWaitMs?: number;
}): Promise<{ presentId: string; absoluteUrl: string; mode: OpenPresentPlan['mode'] }> {
  const open = opts.open ?? ((...args: Parameters<typeof window.open>) => window.open(...args));
  const features = opts.features ?? PRESENT_OPEN_FEATURES;
  const bridgeWindow = opts.bridgeWindow ?? window;
  // Packaged AppImage may expose preload slightly after FileReader import settles.
  // Only wait when the UA looks like Electron — never delay browser about:blank.
  if (!hasPosterBridge(bridgeWindow) && isElectronUserAgent(bridgeWindow)) {
    await waitForPosterBridge(bridgeWindow, { timeoutMs: opts.bridgeWaitMs ?? 2000 });
  }
  const plan = planPresentOpen(bridgeWindow);

  if (plan.mode === 'electron-direct') {
    const { url, presentId } = await opts.spawnPresent();
    const absoluteUrl = toAbsolutePresentUrl(url, opts.origin);
    open(absoluteUrl, '_blank', features);
    return { presentId, absoluteUrl, mode: plan.mode };
  }

  const blank = open('about:blank', '_blank', features);
  try {
    const { url, presentId } = await opts.spawnPresent();
    const absoluteUrl = toAbsolutePresentUrl(url, opts.origin);
    navigatePresentAfterSpawn(blank, url, opts.origin, open, features);
    return { presentId, absoluteUrl, mode: plan.mode };
  } catch (err) {
    if (blank && !blank.closed) blank.close();
    throw err;
  }
}
