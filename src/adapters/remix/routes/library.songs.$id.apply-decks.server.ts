import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import type { SongData } from '../../../domain/PresentTypes';
import { applySongDeckUpdates } from '../../persistence/linkedSongDecks.server';

/**
 * POST /library/songs/:id/apply-decks
 * Apply library edit sync or delete-slide removal to selected decks only.
 */
export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  const songId = params.id;
  if (!songId) return json({ error: 'Missing id' }, { status: 400 });

  let body: {
    action?: string;
    deckIds?: string[];
    baselineLyrics?: SongData;
    overwriteHandEdited?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const actionKind = body.action === 'delete' ? 'delete' : body.action === 'edit' ? 'edit' : null;
  if (!actionKind) {
    return json({ error: 'action must be edit or delete' }, { status: 400 });
  }
  if (!Array.isArray(body.deckIds)) {
    return json({ error: 'deckIds must be an array' }, { status: 400 });
  }
  const baseline = body.baselineLyrics;
  if (!baseline || typeof baseline !== 'object' || typeof baseline.title !== 'string') {
    return json({ error: 'baselineLyrics required' }, { status: 400 });
  }

  try {
    const result = applySongDeckUpdates({
      songId,
      action: actionKind,
      deckIds: body.deckIds.map(String),
      baselineLyrics: {
        title: baseline.title,
        author: typeof baseline.author === 'string' ? baseline.author : undefined,
        verses: Array.isArray(baseline.verses) ? baseline.verses : [],
      },
      overwriteHandEdited: Boolean(body.overwriteHandEdited),
    });
    return json({ ok: true, ...result });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Apply failed' },
      { status: 400 },
    );
  }
};
