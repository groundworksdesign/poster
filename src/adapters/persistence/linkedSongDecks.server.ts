import type { Deck, SongData } from '../../domain/PresentTypes';
import {
  applyLibraryDeleteToDeck,
  applyLibraryEditToDeck,
  countHandEditedLinkedSlides,
  linkedSlidesInDeck,
} from '../../domain/linkedSongUpdate';
import { tryGetSqliteDb } from './db.server';
import { upsertPresentation, upsertPresentationWithDb } from './library.server';
import {
  getSong,
  getSongWithDb,
  listPresentationDeckRows,
  listPresentationDeckRowsWithDb,
} from './songs.server';

export type DeckUsageDetail = {
  id: string;
  title: string;
  linkedSlideCount: number;
  handEditedSlideCount: number;
};

type StoredDeck = Deck & { id?: string };

function parseDeck(deckJson: string, id: string, title: string): StoredDeck | null {
  try {
    const deck = JSON.parse(deckJson) as StoredDeck;
    if (!deck || typeof deck !== 'object') return null;
    return {
      ...deck,
      id,
      title: deck.title || title || 'Untitled',
      slides: Array.isArray(deck.slides) ? deck.slides : [],
    };
  } catch {
    return null;
  }
}

/** Decks that contain at least one slide linked to songId, with hand-edit counts vs baseline. */
export function listDeckUsageForSong(
  songId: string,
  baselineLyrics: SongData,
): DeckUsageDetail[] {
  const sqlite = tryGetSqliteDb();
  const rows = sqlite
    ? listPresentationDeckRowsWithDb(sqlite)
    : listPresentationDeckRows();
  const out: DeckUsageDetail[] = [];
  for (const row of rows) {
    const deck = parseDeck(row.deck_json, row.id, row.title);
    if (!deck) continue;
    const linked = linkedSlidesInDeck(deck, songId);
    if (linked.length === 0) continue;
    out.push({
      id: row.id,
      title: row.title || 'Untitled',
      linkedSlideCount: linked.length,
      handEditedSlideCount: countHandEditedLinkedSlides(deck, songId, baselineLyrics),
    });
  }
  return out;
}

export type ApplyDeckUpdatesResult = {
  decksUpdated: number;
  slidesChanged: number;
  skippedHandEdited: number;
};

/**
 * Apply library edit or delete to selected presentation decks.
 * Unselected decks and unlinked slides are never modified.
 */
export function applySongDeckUpdates(opts: {
  songId: string;
  action: 'edit' | 'delete';
  deckIds: string[];
  baselineLyrics: SongData;
  overwriteHandEdited: boolean;
}): ApplyDeckUpdatesResult {
  const { songId, action, deckIds, baselineLyrics, overwriteHandEdited } = opts;
  const idSet = new Set(deckIds.filter(Boolean));
  if (idSet.size === 0) {
    return { decksUpdated: 0, slidesChanged: 0, skippedHandEdited: 0 };
  }

  const sqlite = tryGetSqliteDb();
  const song = sqlite ? getSongWithDb(sqlite, songId) : getSong(songId);
  if (action === 'edit' && !song) {
    throw new Error('Song not found');
  }

  const newLyrics: SongData = song
    ? {
        title: song.lyrics.title || song.title,
        author: song.lyrics.author ?? song.author ?? undefined,
        verses: song.lyrics.verses ?? [],
      }
    : baselineLyrics;

  const rows = sqlite
    ? listPresentationDeckRowsWithDb(sqlite)
    : listPresentationDeckRows();

  let decksUpdated = 0;
  let slidesChanged = 0;
  let skippedHandEdited = 0;

  for (const row of rows) {
    if (!idSet.has(row.id)) continue;
    const deck = parseDeck(row.deck_json, row.id, row.title);
    if (!deck) continue;

    if (action === 'edit') {
      const result = applyLibraryEditToDeck(
        deck,
        songId,
        newLyrics,
        baselineLyrics,
        overwriteHandEdited,
      );
      if (result.updatedCount === 0 && result.skippedHandEditedCount === 0) continue;
      skippedHandEdited += result.skippedHandEditedCount;
      if (result.updatedCount > 0) {
        const body = { ...result.deck, id: row.id };
        if (sqlite) upsertPresentationWithDb(sqlite, body);
        else upsertPresentation(body);
        decksUpdated += 1;
        slidesChanged += result.updatedCount;
      }
    } else {
      const result = applyLibraryDeleteToDeck(
        deck,
        songId,
        baselineLyrics,
        overwriteHandEdited,
      );
      skippedHandEdited += result.skippedHandEditedCount;
      if (result.removedCount > 0) {
        const body = { ...result.deck, id: row.id };
        if (sqlite) upsertPresentationWithDb(sqlite, body);
        else upsertPresentation(body);
        decksUpdated += 1;
        slidesChanged += result.removedCount;
      }
    }
  }

  return { decksUpdated, slidesChanged, skippedHandEdited };
}

/** Baseline lyrics from the current library song (for delete prompts). */
export function baselineLyricsForSong(songId: string): SongData | null {
  const song = getSong(songId);
  if (!song) return null;
  return {
    title: song.lyrics.title || song.title,
    author: song.lyrics.author ?? song.author ?? undefined,
    verses: song.lyrics.verses ?? [],
  };
}
