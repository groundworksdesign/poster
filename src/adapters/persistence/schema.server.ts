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
  book: string | null;
  number: string | null;
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

type SchemaDb = {
  exec: (sql: string) => void;
  // better-sqlite3 / node:sqlite Statement generics differ; only need `.all()`.
  prepare?: (sql: string) => { all: (...params: any[]) => any[] };
};

/** Add book/number to pre-epic-004 songs tables that only had id/title/author/song_json. */
function migrateSongsColumns(db: SchemaDb): void {
  if (typeof db.prepare !== 'function') return;
  const cols = (db.prepare(`PRAGMA table_info(songs)`).all() as { name: string }[]).map(
    c => c.name,
  );
  if (!cols.includes('book')) {
    db.exec(`ALTER TABLE songs ADD COLUMN book TEXT`);
  }
  if (!cols.includes('number')) {
    db.exec(`ALTER TABLE songs ADD COLUMN number TEXT`);
  }
}

/** Works with `better-sqlite3` or Node's built-in `node:sqlite` (`DatabaseSync`). */
export function initSchema(db: SchemaDb): void {
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
      book        TEXT,
      number      TEXT,
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

  migrateSongsColumns(db);
}
