import {
  duplicateTitleKeys,
  filterSongsByBook,
  firstVerseLine,
  firstVerseText,
  shouldShowFirstVerse,
  uniqueBooks,
} from './librarySongPicker';
import type { LibrarySong } from './librarySong';

function song(
  id: string,
  title: string,
  opts: { book?: string; number?: string; line?: string; lines?: string[] } = {},
): LibrarySong {
  const verseLines = opts.lines ?? (opts.line ? [opts.line] : []);
  return {
    id,
    title,
    book: opts.book ?? null,
    number: opts.number ?? null,
    author: null,
    lyrics: {
      title,
      verses: verseLines.length ? [{ number: 1, lines: verseLines }] : [],
    },
    createdAt: 't',
    updatedAt: 't',
  };
}

describe('librarySongPicker helpers (AC-012)', () => {
  it('firstVerseLine returns the first lyric line', () => {
    expect(firstVerseLine(song('1', 'A', { line: 'First words' }))).toBe('First words');
    expect(firstVerseLine(song('2', 'B'))).toBeNull();
  });

  it('firstVerseText returns the full first verse (Roy / AC-020)', () => {
    expect(
      firstVerseText(
        song('1', 'How Great Thou Art', {
          lines: ['O Lord my God', 'When I in awesome wonder', 'Consider all'],
        }),
      ),
    ).toBe('O Lord my God\nWhen I in awesome wonder\nConsider all');
    expect(firstVerseText(song('2', 'Empty'))).toBeNull();
  });

  it('shows first verse only when titles are duplicated in the result set', () => {
    const songs = [
      song('1', 'Amazing Grace', { number: '1', line: 'Old line' }),
      song('2', 'Amazing Grace', { number: '301', line: 'New line' }),
      song('3', 'Other', { line: 'Alone' }),
    ];
    expect(Array.from(duplicateTitleKeys(songs))).toEqual(['amazing grace']);
    expect(shouldShowFirstVerse(songs[0], songs)).toBe(true);
    expect(shouldShowFirstVerse(songs[2], songs)).toBe(false);
  });

  it('filters by book', () => {
    const songs = [
      song('1', 'A', { book: 'Hymns' }),
      song('2', 'B', { book: 'Children’s Songbook' }),
    ];
    expect(uniqueBooks(songs)).toEqual(['Children’s Songbook', 'Hymns']);
    expect(filterSongsByBook(songs, 'Hymns').map(s => s.id)).toEqual(['1']);
  });
});
