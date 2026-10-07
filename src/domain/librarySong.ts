import type { SongData, SongVerse } from './PresentTypes';

/** One song in the local song library (not a deck slide). */
export type LibrarySong = {
  id: string;
  title: string;
  book: string | null;
  number: string | null;
  author: string | null;
  lyrics: SongData;
  createdAt: string;
  updatedAt: string;
};

/** Payload for creating or updating a library song. */
export type LibrarySongInput = {
  id?: string;
  title: string;
  book?: string | null;
  number?: string | null;
  author?: string | null;
  lyrics: SongData;
};

/**
 * Parse hand-entered lyrics: blank lines separate verses; each non-empty line is a lyric line.
 */
export function parseVersesText(text: string): SongVerse[] {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean);
  return blocks.map((block, index) => ({
    number: index + 1,
    lines: block
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean),
  }));
}
