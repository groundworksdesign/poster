import fs from 'fs';
import os from 'os';
import path from 'path';
import { initSchema } from './schema.server';
import { sqliteDriversAvailable } from './sqliteTestDb';

const describeSqlite = sqliteDriversAvailable() ? describe : describe.skip;

function openFileDb(filePath: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3') as {
      new (path: string): {
        exec: (sql: string) => void;
        prepare: (sql: string) => {
          run: (...p: unknown[]) => unknown;
          get: (...p: unknown[]) => unknown;
          all: (...p: unknown[]) => unknown[];
        };
        close: () => void;
      };
    };
    const db = new Database(filePath);
    db.exec('PRAGMA foreign_keys = ON;');
    initSchema(db);
    return db;
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
    const db = new DatabaseSync(filePath);
    db.exec('PRAGMA foreign_keys = ON;');
    initSchema(db);
    return db;
  }
}

describeSqlite('replaceDb song preserve on restore', () => {
  let tmpRoot: string;
  let dbModule: typeof import('./db.server');

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-db-restore-'));
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    dbModule = require('./db.server') as typeof import('./db.server');
    dbModule.setLibraryDbPath(tmpRoot);
  });

  afterEach(() => {
    try {
      dbModule.tryGetSqliteDb()?.close();
    } catch {
      /* ignore */
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('pre-epic backup with empty songs keeps existing songs and restores decks', () => {
    const live = dbModule.tryGetSqliteDb();
    expect(live).not.toBeNull();
    live!
      .prepare(
        `INSERT INTO songs (id, title, book, number, author, song_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'song-keep',
        'Keep Me',
        'Hymns',
        '1',
        null,
        JSON.stringify({ title: 'Keep Me', verses: [{ number: 1, lines: ['stay'] }] }),
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      );
    live!
      .prepare(
        `INSERT INTO presentations (id, title, date, location, notes, use_green_screen, deck_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'old-deck',
        'Old Deck',
        null,
        null,
        null,
        0,
        JSON.stringify({ title: 'Old Deck', slides: [] }),
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      );

    const backupPath = path.join(tmpRoot, 'pre-epic-backup.sqlite');
    const backup = openFileDb(backupPath);
    backup
      .prepare(
        `INSERT INTO presentations (id, title, date, location, notes, use_green_screen, deck_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'restored-deck',
        'Restored Deck',
        null,
        null,
        null,
        0,
        JSON.stringify({ title: 'Restored Deck', slides: [] }),
        '2026-02-01T00:00:00.000Z',
        '2026-02-01T00:00:00.000Z',
      );
    // intentionally no songs rows (pre-epic-004)
    backup.close();

    dbModule.replaceDb(backupPath);

    const restored = dbModule.tryGetSqliteDb()!;
    const songs = restored.prepare(`SELECT id, title FROM songs`).all() as {
      id: string;
      title: string;
    }[];
    expect(songs).toEqual([{ id: 'song-keep', title: 'Keep Me' }]);

    const decks = restored.prepare(`SELECT id, title FROM presentations`).all() as {
      id: string;
      title: string;
    }[];
    expect(decks).toEqual([{ id: 'restored-deck', title: 'Restored Deck' }]);
  });

  it('backup that includes songs replaces the song library', () => {
    const live = dbModule.tryGetSqliteDb()!;
    live
      .prepare(
        `INSERT INTO songs (id, title, book, number, author, song_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'old-song',
        'Old Song',
        'Hymns',
        '1',
        null,
        JSON.stringify({ title: 'Old Song', verses: [] }),
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      );

    const backupPath = path.join(tmpRoot, 'with-songs-backup.sqlite');
    const backup = openFileDb(backupPath);
    backup
      .prepare(
        `INSERT INTO presentations (id, title, date, location, notes, use_green_screen, deck_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'deck-b',
        'Deck B',
        null,
        null,
        null,
        0,
        JSON.stringify({ title: 'Deck B', slides: [] }),
        '2026-02-01T00:00:00.000Z',
        '2026-02-01T00:00:00.000Z',
      );
    backup
      .prepare(
        `INSERT INTO songs (id, title, book, number, author, song_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'backup-song',
        'From Backup',
        'Hymns',
        '42',
        null,
        JSON.stringify({ title: 'From Backup', verses: [{ number: 1, lines: ['new'] }] }),
        '2026-02-01T00:00:00.000Z',
        '2026-02-01T00:00:00.000Z',
      );
    backup.close();

    dbModule.replaceDb(backupPath);

    const restored = dbModule.tryGetSqliteDb()!;
    const songs = restored.prepare(`SELECT id, title FROM songs`).all() as {
      id: string;
      title: string;
    }[];
    expect(songs).toEqual([{ id: 'backup-song', title: 'From Backup' }]);
  });
});
