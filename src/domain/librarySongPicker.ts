import type { LibrarySong } from './librarySong';

/** First non-empty lyric line across verses, or null. */
export function firstVerseLine(song: LibrarySong): string | null {
  for (const verse of song.lyrics?.verses ?? []) {
    for (const line of verse.lines ?? []) {
      const trimmed = String(line).trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

/** Lowercased titles that appear more than once in the result set. */
export function duplicateTitleKeys(songs: LibrarySong[]): Set<string> {
  const counts = new Map<string, number>();
  for (const song of songs) {
    const key = song.title.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dupes = new Set<string>();
  for (const [key, count] of Array.from(counts.entries())) {
    if (count > 1) dupes.add(key);
  }
  return dupes;
}

/** Whether this row should show the first verse inline (shared title in results). */
export function shouldShowFirstVerse(song: LibrarySong, songs: LibrarySong[]): boolean {
  return duplicateTitleKeys(songs).has(song.title.trim().toLowerCase());
}

/** Unique book names from songs, sorted, for optional filter. */
export function uniqueBooks(songs: LibrarySong[]): string[] {
  const books = new Set<string>();
  for (const song of songs) {
    if (song.book && song.book.trim()) books.add(song.book.trim());
  }
  return Array.from(books).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function filterSongsByBook<T extends LibrarySong>(
  songs: T[],
  bookFilter: string,
): T[] {
  const book = bookFilter.trim();
  if (!book) return songs;
  return songs.filter(s => (s.book ?? '').trim() === book);
}
