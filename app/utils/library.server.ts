import type { Database } from 'better-sqlite3';
import db from './db.server';
import type { Deck } from '../../src/Present/PresentTypes';

type SaveBody = Deck & { id?: string };

function generateId(): string {
  return typeof (globalThis as any).crypto !== 'undefined' && typeof (globalThis as any).crypto.randomUUID === 'function'
    ? (globalThis as any).crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function upsertPresentationWithDb(database: Database, body: SaveBody): string {
  const now = new Date().toISOString();
  const providedId = body.id && typeof body.id === 'string' && body.id.length > 0 ? body.id : null;

  if (providedId) {
    const row = database.prepare('SELECT id FROM presentations WHERE id = ?').get(providedId);
    if (row) {
      database
        .prepare(
          `UPDATE presentations
           SET title = ?, date = ?, location = ?, notes = ?, use_green_screen = ?, deck_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          body.title ?? '',
          body.date ?? null,
          body.location ?? null,
          body.notes ?? null,
          body.useGreenScreen ? 1 : 0,
          JSON.stringify(body),
          now,
          providedId,
        );
      return providedId;
    }
  }

  const id = generateId();
  database
    .prepare(
      `INSERT INTO presentations (id, title, date, location, notes, use_green_screen, deck_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      body.title ?? '',
      body.date ?? null,
      body.location ?? null,
      body.notes ?? null,
      body.useGreenScreen ? 1 : 0,
      JSON.stringify(body),
      now,
      now,
    );

  return id;
}

export function upsertPresentation(body: SaveBody): string {
  return upsertPresentationWithDb(db, body);
}
