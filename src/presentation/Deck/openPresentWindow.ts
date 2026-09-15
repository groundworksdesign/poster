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

/** True when the Electron preload bridge is present (packaged or `electron .`). */
export function hasPosterBridge(
  win: { poster?: unknown } = typeof window !== 'undefined' ? window : {},
): boolean {
  return !!win.poster;
}

/**
 * Wait briefly for Electron preload (`window.poster`) before choosing Present open mode.
 * AppImage/FUSE can delay first preload inject after heavy FileReader import I/O; falling
 * through to about:blank immediately recreates the SSR Loading hang on cold Open Present.
 */
export async function waitForPosterBridge(
  win: { poster?: unknown } = typeof window !== 'undefined' ? window : {},
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
  win: { poster?: unknown } = typeof window !== 'undefined' ? window : {},
): OpenPresentPlan {
  return hasPosterBridge(win) ? { mode: 'electron-direct' } : { mode: 'browser-gesture-blank' };
}

/**
 * Open Present for the current runtime.
 * Electron: spawn first, then window.open(absolute Present URL) — no about:blank.
 * Browser: about:blank in the click turn, then absolute navigate after spawn.
 */
export async function openPresentForRuntime(opts: {
  spawnPresent: () => Promise<{ url: string; presentId: string }>;
  origin: string;
  open?: typeof window.open;
  features?: string;
  bridgeWindow?: { poster?: unknown };
  bridgeWaitMs?: number;
}): Promise<{ presentId: string; absoluteUrl: string; mode: OpenPresentPlan['mode'] }> {
  const open = opts.open ?? ((...args: Parameters<typeof window.open>) => window.open(...args));
  const features = opts.features ?? PRESENT_OPEN_FEATURES;
  const bridgeWindow = opts.bridgeWindow ?? window;
  // Packaged AppImage may expose preload slightly after FileReader import settles.
  if (!hasPosterBridge(bridgeWindow)) {
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
