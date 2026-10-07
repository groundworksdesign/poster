import { initSchema } from './schema.server';
import {
  createInMemorySqliteDb,
  sqliteDriversAvailable,
  type SqliteTestDb,
} from './sqliteTestDb';

const describeSqlite = sqliteDriversAvailable() ? describe : describe.skip;

describeSqlite('initSchema', () => {
  let db: SqliteTestDb;

  beforeEach(() => {
    db = createInMemorySqliteDb();
  });

  afterEach(() => {
    db?.close();
  });

  it('creates presentations, songs, and assets tables', () => {
    initSchema(db);

    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
      .all() as { name: string }[];

    const names = tables.map(t => t.name);
    expect(names).toContain('presentations');
    expect(names).toContain('songs');
    expect(names).toContain('assets');
  });

  it('is idempotent -- calling initSchema twice does not throw', () => {
    expect(() => {
      initSchema(db);
      initSchema(db);
    }).not.toThrow();
  });

  it('presentations table has expected columns', () => {
    initSchema(db);

    const cols = db
      .prepare(`PRAGMA table_info(presentations)`)
      .all() as { name: string }[];

    const colNames = cols.map(c => c.name);
    expect(colNames).toEqual(
      expect.arrayContaining([
        'id',
        'title',
        'date',
        'location',
        'notes',
        'use_green_screen',
        'deck_json',
        'created_at',
        'updated_at',
      ]),
    );
  });

  it('songs table has expected columns including book and number', () => {
    initSchema(db);

    const cols = db
      .prepare(`PRAGMA table_info(songs)`)
      .all() as { name: string }[];

    const colNames = cols.map(c => c.name);
    expect(colNames).toEqual(
      expect.arrayContaining([
        'id',
        'title',
        'book',
        'number',
        'author',
        'song_json',
        'created_at',
        'updated_at',
      ]),
    );
  });

  it('migrates legacy songs table by adding book and number columns', () => {
    db.exec(`
      CREATE TABLE songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        song_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    initSchema(db);

    const cols = db
      .prepare(`PRAGMA table_info(songs)`)
      .all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    expect(colNames).toEqual(expect.arrayContaining(['book', 'number']));
  });

  it('fresh songs table has zero rows (AC-001)', () => {
    initSchema(db);
    const rows = db.prepare(`SELECT COUNT(*) AS n FROM songs`).get() as { n: number };
    expect(Number(rows.n)).toBe(0);
  });

  it('assets table has expected columns', () => {
    initSchema(db);

    const cols = db
      .prepare(`PRAGMA table_info(assets)`)
      .all() as { name: string }[];

    const colNames = cols.map(c => c.name);
    expect(colNames).toEqual(
      expect.arrayContaining(['id', 'name', 'mime_type', 'data', 'created_at']),
    );
  });

  it('can insert and retrieve a presentation row', () => {
    initSchema(db);

    const id = 'test-id-1';
    db.prepare(
      `INSERT INTO presentations (id, title, deck_json) VALUES (?, ?, ?)`,
    ).run(id, 'My Service', '{}');

    const row = db
      .prepare(`SELECT id, title FROM presentations WHERE id = ?`)
      .get(id) as { id: string; title: string };

    expect(row.id).toBe(id);
    expect(row.title).toBe('My Service');
  });
});
