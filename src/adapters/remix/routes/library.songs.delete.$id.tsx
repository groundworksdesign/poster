import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import { deleteSong } from '../../persistence/songs.server';

/**
 * DELETE/POST /library/songs/delete/:id — remove a song from the local library only.
 * Does not update decks (linked-update-decks owns the confirm + deck rewrite flow).
 */
export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  const id = params.id;
  if (!id) {
    return json({ error: 'Missing id' }, { status: 400 });
  }
  if (!deleteSong(id)) {
    return json({ error: 'Not found' }, { status: 404 });
  }
  return json({ ok: true, id });
};

export default function DeleteSongRoute() {
  return null;
}
