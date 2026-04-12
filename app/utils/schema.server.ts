import type { Database } from 'better-sqlite3';

export interface PresentationRow {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
  notes: string | null;
  use_green_screen: number;
  deck_json: string;
  created_at: string;
  updated_at: string;
}

export interface SongRow {
  id: string;
  title: string;
  author: string | null;
  song_json: string;
  created_at: string;
  updated_at: string;
}

export interface AssetRow {
  id: string;
  name: string;
  mime_type: string;
  data: Buffer;
  created_at: string;
}

export function initSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS presentations (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      date           TEXT,
      location       TEXT,
      notes          TEXT,
      use_green_screen INTEGER NOT NULL DEFAULT 0,
      deck_json      TEXT NOT NULL,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS songs (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      author      TEXT,
      song_json   TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assets (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      mime_type   TEXT NOT NULL,
      data        BLOB NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
