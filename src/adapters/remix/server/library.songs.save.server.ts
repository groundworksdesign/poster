import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import { upsertSong } from '../../persistence/songs.server';
import type { LibrarySongInput } from '../../../domain/librarySong';
import type { SongData } from '../../../domain/PresentTypes';

function isSongData(value: unknown): value is SongData {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (typeof o.title !== 'string') return false;
  if (!Array.isArray(o.verses)) return false;
  return true;
}

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body: LibrarySongInput;
  try {
    body = (await request.json()) as LibrarySongInput;
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return json({ error: 'Song must have a title' }, { status: 400 });
  }
  if (!isSongData(body.lyrics)) {
    return json({ error: 'Song must include lyrics with verses' }, { status: 400 });
  }

  const id = upsertSong({
    id: typeof body.id === 'string' && body.id.length > 0 ? body.id : undefined,
    title,
    book: body.book ?? null,
    number: body.number ?? null,
    author: body.author ?? null,
    lyrics: {
      title: body.lyrics.title?.trim() || title,
      author: body.lyrics.author,
      verses: body.lyrics.verses,
    },
  });

  return json({ ok: true, id });
};
