/**
 * LibrarySongPicker clears the search on Esc and sets this flag so the window-level
 * Esc handler does not also back out a panel level on the same keypress.
 * Pair with preventDefault (not stopPropagation) so the window listener still runs
 * and can consume the flag via consumeSearchEscFlag / defaultPrevented.
 */
let searchEscConsumed = false;

export function markSearchEscConsumed(): void {
  searchEscConsumed = true;
}

export function consumeSearchEscFlag(): boolean {
  const v = searchEscConsumed;
  searchEscConsumed = false;
  return v;
}
