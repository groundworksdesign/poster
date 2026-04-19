import { tryGetSqliteDb } from './db.server';
import * as jsonLibrary from './library-json.server';
import type { Deck } from '../../src/Present/PresentTypes';

type SaveBody = Deck & { id?: string };

/** `better-sqlite3` or Node `node:sqlite` DatabaseSync — same prepare/run/get API. */
type SqliteDb = {
  prepare: (sql: string) => {
    run: (...params: unknown[]) => unknown;
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown;
  };
};

function generateId(): string {
  return typeof (globalThis as any).crypto !== 'undefined' && typeof (globalThis as any).crypto.randomUUID === 'function'
    ? (globalThis as any).crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function upsertPresentationWithDb(database: SqliteDb, body: SaveBody): string {
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
  const sqlite = tryGetSqliteDb();
  if (sqlite) {
    return upsertPresentationWithDb(sqlite, body);
  }
  return jsonLibrary.jsonLibraryUpsert(body);
}
