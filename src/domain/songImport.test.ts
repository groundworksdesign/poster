import {
  buildImportReviewPlan,
  defaultImportSelections,
  parseGatheredOrSongJson,
  parseImportFileContent,
  resolveImportSelections,
} from './songImport';
import type { LibrarySong } from './librarySong';

const existing: LibrarySong = {
  id: 'lib-1',
  title: 'Amazing Grace',
  book: 'Hymns',
  number: '1',
  author: null,
  lyrics: {
    title: 'Amazing Grace',
    verses: [{ number: 1, lines: ['Amazing grace, how sweet the sound'] }],
  },
  createdAt: 't',
  updatedAt: 't',
};

describe('songImport (import-review-screen ACs)', () => {
  it('AC-003: parses gathered book JSON and Poster song JSON', () => {
    const book = parseGatheredOrSongJson(
      {
        book: 'Hymns',
        songs: [
          {
            title: 'Song A',
            number: '10',
            verses: [{ number: 1, lines: ['Line one'] }],
          },
          {
            title: 'Song B',
            number: '11',
            lyrics: ['Only line'],
          },
        ],
      },
      'hymns.json',
    );
    expect(book).toHaveLength(2);
    expect(book[0].book).toBe('Hymns');
    expect(book[0].number).toBe('10');
    expect(book[1].verses[0].lines[0]).toBe('Only line');

    const single = parseGatheredOrSongJson(
      {
        title: 'Solo',
        verses: [{ number: 1, lines: ['Hi'] }],
      },
      'solo.json',
    );
    expect(single).toHaveLength(1);
    expect(single[0].title).toBe('Solo');
  });

  it('AC-003: parses Poster song XML', async () => {
    const xml = `<?xml version="1.0"?><Song><Title>XML Song</Title><Author/><Lyrics><Verse label="PlainText">1. First line\nSecond line</Verse></Lyrics></Song>`;
    const songs = await parseImportFileContent(xml, 'sample.xml');
    expect(songs).toHaveLength(1);
    expect(songs[0].title).toBe('XML Song');
    expect(songs[0].hasLyrics).toBe(true);
  });

  it('AC-004 / AC-018: multi-song needs review; clean file resolves in one confirm', () => {
    const candidates = parseGatheredOrSongJson(
      {
        book: 'Hymns',
        songs: [
          { title: 'One', number: '1', verses: [{ number: 1, lines: ['A'] }] },
          { title: 'Two', number: '2', verses: [{ number: 1, lines: ['B'] }] },
        ],
      },
      'hymns.json',
    );
    const plan = buildImportReviewPlan(candidates, [], 'hymns.json');
    expect(plan.needsReview).toBe(true);
    expect(plan.noLyricsKeys).toEqual([]);
    expect(plan.titleMatches).toEqual([]);
    // Nothing imported until resolve with selections (checklist confirm)
    expect(resolveImportSelections(plan, { checkedKeys: [], noLyricsAction: 'skip', titleMatchActions: {} })).toEqual(
      [],
    );
    const selections = defaultImportSelections(plan);
    const payloads = resolveImportSelections(plan, selections);
    expect(payloads).toHaveLength(2);
    expect(payloads.map(p => p.title)).toEqual(['One', 'Two']);
  });

  it('AC-005 / AC-015: no-lyrics songs wait on group action (title only or skip)', () => {
    const candidates = parseGatheredOrSongJson(
      {
        songs: [
          { title: 'Empty', number: '5', verses: [] },
          { title: 'Full', number: '6', verses: [{ number: 1, lines: ['Words'] }] },
        ],
      },
      'book.json',
    );
    const plan = buildImportReviewPlan(candidates, [], 'book.json');
    expect(plan.needsReview).toBe(true);
    expect(plan.noLyricsKeys).toEqual(['song-0']);

    const skip = resolveImportSelections(plan, {
      checkedKeys: ['song-0', 'song-1'],
      noLyricsAction: 'skip',
      titleMatchActions: {},
    });
    expect(skip.map(s => s.title)).toEqual(['Full']);

    const titleOnly = resolveImportSelections(plan, {
      checkedKeys: ['song-0', 'song-1'],
      noLyricsAction: 'title_only',
      titleMatchActions: {},
    });
    expect(titleOnly).toHaveLength(2);
    expect(titleOnly.find(s => s.title === 'Empty')?.lyrics.verses).toEqual([]);
  });

  it('AC-006 / AC-015: title match shows number/lyrics; default keep both; replace and skip', () => {
    const candidates = parseGatheredOrSongJson(
      {
        songs: [
          {
            title: 'Amazing Grace',
            number: '301',
            verses: [{ number: 1, lines: ['Different lyrics here'] }],
          },
        ],
      },
      'more.json',
    );
    const plan = buildImportReviewPlan(candidates, [existing], 'more.json');
    expect(plan.needsReview).toBe(true);
    expect(plan.titleMatches).toHaveLength(1);
    expect(plan.titleMatches[0].existingNumber).toBe('1');
    expect(plan.titleMatches[0].existingLyricsPreview).toContain('Amazing grace');
    expect(plan.titleMatches[0].incomingNumber).toBe('301');
    expect(plan.titleMatches[0].incomingLyricsPreview).toContain('Different lyrics');

    const defaults = defaultImportSelections(plan);
    expect(defaults.titleMatchActions['song-0']).toBe('keep_both');
    const keepBoth = resolveImportSelections(plan, defaults);
    expect(keepBoth).toHaveLength(1);
    expect(keepBoth[0].id).toBeUndefined();

    const replace = resolveImportSelections(plan, {
      ...defaults,
      titleMatchActions: { 'song-0': 'replace' },
    });
    expect(replace[0].id).toBe('lib-1');

    const skip = resolveImportSelections(plan, {
      ...defaults,
      titleMatchActions: { 'song-0': 'skip' },
    });
    expect(skip).toEqual([]);
  });

  it('AC-022: single clean song skips review screen', () => {
    const candidates = parseGatheredOrSongJson(
      { title: 'Clean', verses: [{ number: 1, lines: ['Only'] }] },
      'clean.json',
    );
    const plan = buildImportReviewPlan(candidates, [], 'clean.json');
    expect(plan.needsReview).toBe(false);
    expect(plan.noLyricsKeys).toEqual([]);
    expect(plan.titleMatches).toEqual([]);
  });

  it('does not treat deck JSON as a song import', () => {
    expect(() =>
      parseGatheredOrSongJson(
        { title: 'Deck', slides: [{ type: 'title', title: 'Hi' }] },
        'deck.json',
      ),
    ).toThrow(/Unrecognized/i);
  });
});
