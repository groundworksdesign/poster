/**
 * Helpers for counting which saved presentations use a library song.
 * Seam for linked-update-decks: listDecksUsingSongId returns the decks that
 * the future confirm UI will checkbox; this task only surfaces the count.
 */

export type DeckUsageRef = {
  id: string;
  title: string;
};

type SlideLike = {
  librarySongId?: string | null;
};

type DeckLike = {
  slides?: SlideLike[] | null;
};

/**
 * True when any slide in the deck JSON is linked to the given library song id.
 */
export function deckUsesLibrarySong(deckJson: string | null | undefined, songId: string): boolean {
  if (!deckJson || !songId) return false;
  try {
    const deck = JSON.parse(deckJson) as DeckLike;
    const slides = Array.isArray(deck?.slides) ? deck.slides : [];
    return slides.some(s => s && s.librarySongId === songId);
  } catch {
    return false;
  }
}

/** Presentations (id + title) whose deck_json links to songId. */
export function listDecksUsingSongId(
  presentations: Array<{ id: string; title: string; deck_json: string }>,
  songId: string,
): DeckUsageRef[] {
  const out: DeckUsageRef[] = [];
  for (const p of presentations) {
    if (deckUsesLibrarySong(p.deck_json, songId)) {
      out.push({ id: p.id, title: p.title || 'Untitled' });
    }
  }
  return out;
}

/** Count of saved presentations that link to songId. */
export function countDecksUsingSongId(
  presentations: Array<{ id: string; title: string; deck_json: string }>,
  songId: string,
): number {
  return listDecksUsingSongId(presentations, songId).length;
}

/** Map songId -> number of decks that use it. */
export function countUsageBySongId(
  presentations: Array<{ id: string; title: string; deck_json: string }>,
  songIds: string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of songIds) counts[id] = 0;
  for (const p of presentations) {
    let deck: DeckLike;
    try {
      deck = JSON.parse(p.deck_json) as DeckLike;
    } catch {
      continue;
    }
    const slides = Array.isArray(deck?.slides) ? deck.slides : [];
    const seen = new Set<string>();
    for (const s of slides) {
      const sid = s?.librarySongId;
      if (!sid || seen.has(sid)) continue;
      if (sid in counts) {
        counts[sid] += 1;
        seen.add(sid);
      }
    }
  }
  return counts;
}
