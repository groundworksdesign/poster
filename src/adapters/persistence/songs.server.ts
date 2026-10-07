import { tryGetSqliteDb } from './db.server';
import * as jsonLibrary from './library-json.server';
import type { LibrarySong, LibrarySongInput } from '../../domain/librarySong';
import type { SongData } from '../../domain/PresentTypes';

/** `better-sqlite3` or Node `node:sqlite` DatabaseSync — same prepare/run/get API. */
type SqliteDb = {
  prepare: (sql: string) => {
    run: (...params: any[]) => any;
    get: (...params: any[]) => any;
    all: (...params: any[]) => any;
  };
};

type SongDbRow = {
  id: string;
  title: string;
  book: string | null;
  number: string | null;
  author: string | null;
  song_json: string;
  created_at: string;
  updated_at: string;
};

function generateId(): string {
  return typeof (globalThis as any).crypto !== 'undefined' &&
    typeof (globalThis as any).crypto.randomUUID === 'function'
    ? (globalThis as any).crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseLyrics(songJson: string): SongData {
  try {
    const parsed = JSON.parse(songJson) as SongData;
    if (!parsed || typeof parsed !== 'object') {
      return { title: '', verses: [] };
    }
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      author: typeof parsed.author === 'string' ? parsed.author : undefined,
      verses: Array.isArray(parsed.verses) ? parsed.verses : [],
    };
  } catch {
    return { title: '', verses: [] };
  }
}

function rowToLibrarySong(row: SongDbRow): LibrarySong {
  return {
    id: row.id,
    title: row.title,
    book: row.book ?? null,
    number: row.number ?? null,
    author: row.author ?? null,
    lyrics: parseLyrics(row.song_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listSongsWithDb(database: SqliteDb): LibrarySong[] {
  const rows = database
    .prepare(
      `SELECT id, title, book, number, author, song_json, created_at, updated_at
       FROM songs
       ORDER BY title COLLATE NOCASE ASC, number COLLATE NOCASE ASC, id ASC`,
    )
    .all() as SongDbRow[];
  return rows.map(rowToLibrarySong);
}

export function getSongWithDb(database: SqliteDb, id: string): LibrarySong | null {
  const row = database
    .prepare(
      `SELECT id, title, book, number, author, song_json, created_at, updated_at
       FROM songs WHERE id = ?`,
    )
    .get(id) as SongDbRow | undefined;
  return row ? rowToLibrarySong(row) : null;
}

export function upsertSongWithDb(database: SqliteDb, body: LibrarySongInput): string {
  const now = new Date().toISOString();
  const title = body.title?.trim() || 'Untitled';
  const book = body.book ?? null;
  const number = body.number ?? null;
  const author = body.author ?? null;
  const lyrics: SongData = {
    title: body.lyrics?.title?.trim() || title,
    author: body.lyrics?.author ?? author ?? undefined,
    verses: Array.isArray(body.lyrics?.verses) ? body.lyrics.verses : [],
  };
  const songJson = JSON.stringify(lyrics);
  const providedId =
    body.id && typeof body.id === 'string' && body.id.length > 0 ? body.id : null;

  if (providedId) {
    const existing = database.prepare('SELECT id FROM songs WHERE id = ?').get(providedId);
    if (existing) {
      database
        .prepare(
          `UPDATE songs
           SET title = ?, book = ?, number = ?, author = ?, song_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(title, book, number, author, songJson, now, providedId);
      return providedId;
    }
  }

  const id = providedId ?? generateId();
  database
    .prepare(
      `INSERT INTO songs (id, title, book, number, author, song_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, title, book, number, author, songJson, now, now);
  return id;
}

/** Fresh install / empty library: zero rows. Never seeds church books. */
export function listSongs(): LibrarySong[] {
  const sqlite = tryGetSqliteDb();
  if (sqlite) {
    return listSongsWithDb(sqlite);
  }
  return jsonLibrary.jsonLibraryListSongs();
}

export function getSong(id: string): LibrarySong | null {
  const sqlite = tryGetSqliteDb();
  if (sqlite) {
    return getSongWithDb(sqlite, id);
  }
  return jsonLibrary.jsonLibraryGetSong(id);
}

export function upsertSong(body: LibrarySongInput): string {
  const sqlite = tryGetSqliteDb();
  if (sqlite) {
    return upsertSongWithDb(sqlite, body);
  }
  return jsonLibrary.jsonLibraryUpsertSong(body);
}
