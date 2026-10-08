import { json } from '@remix-run/node';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import type { SongData } from '../../../domain/PresentTypes';
import {
  baselineLyricsForSong,
  listDeckUsageForSong,
} from '../../persistence/linkedSongDecks.server';

function parseBaseline(body: unknown): SongData | null {
  if (!body || typeof body !== 'object') return null;
  const lyrics = (body as { baselineLyrics?: SongData }).baselineLyrics;
  if (!lyrics || typeof lyrics !== 'object' || typeof lyrics.title !== 'string') return null;
  return {
    title: lyrics.title,
    author: typeof lyrics.author === 'string' ? lyrics.author : undefined,
    verses: Array.isArray(lyrics.verses) ? lyrics.verses : [],
  };
}

/**
 * GET /library/songs/:id/decks — decks using song; hand-edit vs current library lyrics.
 * POST with { baselineLyrics } — same, but hand-edit vs provided baseline (after an edit save).
 */
export const loader: LoaderFunction = ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: 'Missing id' }, { status: 400 });
  const baseline = baselineLyricsForSong(id);
  if (!baseline) return json({ error: 'Not found' }, { status: 404 });
  return json({ ok: true, songId: id, decks: listDeckUsageForSong(id, baseline) });
};

export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  const id = params.id;
  if (!id) return json({ error: 'Missing id' }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const fromBody = parseBaseline(body);
  const baseline = fromBody ?? baselineLyricsForSong(id);
  if (!baseline) return json({ error: 'Not found' }, { status: 404 });

  return json({ ok: true, songId: id, decks: listDeckUsageForSong(id, baseline) });
};
