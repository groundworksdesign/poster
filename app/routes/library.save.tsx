import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import db from '../utils/db.server';
import type { Deck } from '../../src/Present/PresentTypes';

function generateId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let deck: Deck;
  try {
    deck = (await request.json()) as Deck;
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!deck || !deck.title) {
    return json({ error: 'Deck must have a title' }, { status: 400 });
  }

  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO presentations (id, title, date, location, notes, use_green_screen, deck_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    deck.title ?? '',
    deck.date ?? null,
    deck.location ?? null,
    deck.notes ?? null,
    deck.useGreenScreen ? 1 : 0,
    JSON.stringify(deck),
    now,
    now,
  );

  return json({ ok: true, id });
};
