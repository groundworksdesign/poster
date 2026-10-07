import {
  countDecksUsingSongId,
  countUsageBySongId,
  deckUsesLibrarySong,
  listDecksUsingSongId,
} from './librarySongUsage';

function deckJson(slides: Array<{ librarySongId?: string }>) {
  return JSON.stringify({ title: 'D', slides });
}

describe('librarySongUsage (used-in-N-decks seam)', () => {
  it('detects linked slides in deck JSON', () => {
    expect(deckUsesLibrarySong(deckJson([{ librarySongId: 's1' }]), 's1')).toBe(true);
    expect(deckUsesLibrarySong(deckJson([{ librarySongId: 's2' }]), 's1')).toBe(false);
    expect(deckUsesLibrarySong('not-json', 's1')).toBe(false);
  });

  it('lists and counts decks using a song (once per deck)', () => {
    const presentations = [
      { id: 'p1', title: 'Sunday', deck_json: deckJson([{ librarySongId: 's1' }, { librarySongId: 's1' }]) },
      { id: 'p2', title: 'Wed', deck_json: deckJson([{ librarySongId: 's2' }]) },
      { id: 'p3', title: 'Both', deck_json: deckJson([{ librarySongId: 's1' }, { librarySongId: 's2' }]) },
    ];
    expect(listDecksUsingSongId(presentations, 's1').map(d => d.id)).toEqual(['p1', 'p3']);
    expect(countDecksUsingSongId(presentations, 's1')).toBe(2);
    expect(countUsageBySongId(presentations, ['s1', 's2', 's3'])).toEqual({
      s1: 2,
      s2: 2,
      s3: 0,
    });
  });
});
