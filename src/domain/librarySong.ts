import type { SongData } from './PresentTypes';

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
