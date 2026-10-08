/**
 * Page-wide Present navigation shortcuts (arrows / Page) must not fire while the
 * operator is interacting with the slide list or the slide edit panel.
 */
export function shouldIgnorePresentShortcuts(target: EventTarget | null): boolean {
  const el =
    target instanceof Element
      ? target
      : typeof document !== 'undefined'
        ? document.activeElement
        : null;
  if (!(el instanceof HTMLElement)) return false;

  const tag = el.tagName?.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;

  if (el.closest('[data-testid="deck-slide-editor-panel"]')) return true;
  if (el.closest('[data-testid="deck-slides-list"]')) return true;
  return false;
}
