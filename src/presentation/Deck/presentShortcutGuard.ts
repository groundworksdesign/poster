/**
 * Page-wide Present navigation shortcuts (arrows / Page) must not fire while the
 * operator is interacting with the slide list or the slide edit panel — including
 * clicks on non-focusable row text or the panel background (Iris N1).
 */

let lastDeckUiPointerTarget: EventTarget | null = null;

function isInsideDeckUi(target: EventTarget | null): boolean {
  const el =
    target instanceof Element
      ? target
      : null;
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('[data-testid="deck-slide-editor-panel"]')) return true;
  if (el.closest('[data-testid="deck-slides-list"]')) return true;
  return false;
}

/** Call from a capturing pointerdown listener so click-focus on body still guards. */
export function notePresentShortcutPointerTarget(target: EventTarget | null): void {
  if (isInsideDeckUi(target)) {
    lastDeckUiPointerTarget = target;
  } else if (target instanceof Element) {
    // Click outside clears the deck-ui latch.
    lastDeckUiPointerTarget = null;
  }
}

/** Test helper / reset. */
export function clearPresentShortcutPointerTarget(): void {
  lastDeckUiPointerTarget = null;
}

export function shouldIgnorePresentShortcuts(target: EventTarget | null): boolean {
  const el =
    target instanceof Element
      ? target
      : typeof document !== 'undefined'
        ? document.activeElement
        : null;

  if (el instanceof HTMLElement) {
    const tag = el.tagName?.toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    if (isInsideDeckUi(el)) return true;
  }

  // Active element may be <body> after clicking non-focusable panel/list chrome.
  if (isInsideDeckUi(lastDeckUiPointerTarget)) return true;

  return false;
}
