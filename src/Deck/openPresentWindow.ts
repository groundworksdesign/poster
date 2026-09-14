/**
 * Present window open helpers.
 *
 * Packaged Electron denies `about:blank` unless classified, and relative
 * `/presentation?...` hrefs assigned onto an about:blank shell fail to hydrate.
 * Always navigate with an absolute same-origin Present URL after spawn.
 */

export const PRESENT_OPEN_FEATURES =
  'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes';

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
