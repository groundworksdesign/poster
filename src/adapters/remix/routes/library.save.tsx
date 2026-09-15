import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import { upsertPresentation } from '../../persistence/library.server';
import type { Deck } from '../../../domain/PresentTypes';

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body: Deck & { id?: string };
  try {
    body = (await request.json()) as Deck & { id?: string };
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || !body.title) {
    return json({ error: 'Deck must have a title' }, { status: 400 });
  }

  const id = upsertPresentation(body);
  return json({ ok: true, id });
};
