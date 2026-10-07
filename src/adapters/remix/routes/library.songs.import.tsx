import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import { upsertSong } from '../../persistence/songs.server';
import type { LibrarySongInput } from '../../../domain/librarySong';
import type { SongData } from '../../../domain/PresentTypes';

function isSongDataLoose(value: unknown): value is SongData {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (typeof o.title !== 'string') return false;
  if (!Array.isArray(o.verses)) return false;
  return true;
}

/**
 * POST /library/songs/import — upsert resolved import payloads into the song library.
 * Never touches presentation decks / open deck state.
 * GET renders the import review UI (default export).
 */
export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body: { songs?: LibrarySongInput[] };
  try {
    body = (await request.json()) as { songs?: LibrarySongInput[] };
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.songs)) {
    return json({ error: 'Expected { songs: [...] }' }, { status: 400 });
  }

  const ids: string[] = [];
  for (const song of body.songs) {
    const title = typeof song?.title === 'string' ? song.title.trim() : '';
    if (!title) {
      return json({ error: 'Each song must have a title' }, { status: 400 });
    }
    if (!isSongDataLoose(song.lyrics)) {
      return json({ error: `Song "${title}" must include lyrics with verses` }, { status: 400 });
    }
    const id = upsertSong({
      id: typeof song.id === 'string' && song.id.length > 0 ? song.id : undefined,
      title,
      book: song.book ?? null,
      number: song.number ?? null,
      author: song.author ?? null,
      lyrics: {
        title: song.lyrics.title?.trim() || title,
        author: song.lyrics.author,
        verses: song.lyrics.verses,
      },
    });
    ids.push(id);
  }

  return json({ ok: true, ids, importedCount: ids.length });
};

export { default } from '../../../presentation/SongLibrary/ImportSongsReview';
