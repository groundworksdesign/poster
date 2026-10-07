import { initSchema } from './schema.server';
import {
  findSongsWithDb,
  getSongWithDb,
  listSongsWithDb,
  upsertSongWithDb,
} from './songs.server';
import {
  createInMemorySqliteDb,
  sqliteDriversAvailable,
  type SqliteTestDb,
} from './sqliteTestDb';

function makeDb(): SqliteTestDb {
  const db = createInMemorySqliteDb();
  initSchema(db);
  return db;
}

const describeSqlite = sqliteDriversAvailable() ? describe : describe.skip;

const sampleLyrics = {
  title: 'How Firm a Foundation',
  author: '',
  verses: [{ number: 1, lines: ['How firm a foundation, ye saints of the Lord'] }],
};

describeSqlite('song library persistence (empty-library-schema / AC-001)', () => {
  let db: SqliteTestDb;

  beforeEach(() => {
    db = makeDb();
  });

  afterEach(() => {
    db.close();
  });

  it('lists zero songs on a fresh schema (AC-001 / REQ-001)', () => {
    expect(listSongsWithDb(db)).toEqual([]);
  });

  it('does not seed church books into the songs table', () => {
    const rows = db.prepare('SELECT title, book FROM songs').all() as {
      title: string;
      book: string | null;
    }[];
    expect(rows).toHaveLength(0);
    const bundledTitles = [
      'How Firm a Foundation',
      'I Am a Child of God',
      'Come, Come, Ye Saints',
    ];
    for (const title of bundledTitles) {
      expect(rows.find(r => r.title === title)).toBeUndefined();
    }
  });

  it('stores title, book, number, lyrics, and a stable song id', () => {
    const id = upsertSongWithDb(db, {
      title: 'How Firm a Foundation',
      book: 'Hymns',
      number: '85',
      author: null,
      lyrics: sampleLyrics,
    });

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);

    const song = getSongWithDb(db, id);
    expect(song).not.toBeNull();
    expect(song!.id).toBe(id);
    expect(song!.title).toBe('How Firm a Foundation');
    expect(song!.book).toBe('Hymns');
    expect(song!.number).toBe('85');
    expect(song!.lyrics.verses[0].lines[0]).toContain('How firm a foundation');

    const again = upsertSongWithDb(db, {
      id,
      title: 'How Firm a Foundation',
      book: 'Hymns',
      number: '85',
      lyrics: {
        ...sampleLyrics,
        verses: [
          {
            number: 1,
            lines: ['How firm a foundation, ye saints of the Lord', 'Is laid for your faith'],
          },
        ],
      },
    });
    expect(again).toBe(id);
    expect(listSongsWithDb(db)).toHaveLength(1);
    expect(getSongWithDb(db, id)!.lyrics.verses[0].lines).toHaveLength(2);
  });

  it('keeps provided id when inserting a new song with that id', () => {
    const id = upsertSongWithDb(db, {
      id: 'stable-song-1',
      title: 'Title Only',
      book: 'Children’s Songbook',
      number: '2',
      lyrics: { title: 'Title Only', verses: [] },
    });
    expect(id).toBe('stable-song-1');
    expect(getSongWithDb(db, 'stable-song-1')?.book).toBe('Children’s Songbook');
  });
});

describeSqlite('hand-add then find (AC-002 / REQ-002)', () => {
  let db: SqliteTestDb;

  beforeEach(() => {
    db = makeDb();
  });

  afterEach(() => {
    db.close();
  });

  it('finds a hand-added song by title, book, number, and lyric phrase', () => {
    upsertSongWithDb(db, {
      title: 'Be Still, My Soul',
      book: 'Hymns',
      number: '124',
      lyrics: {
        title: 'Be Still, My Soul',
        verses: [{ number: 1, lines: ['Be still, my soul: The Lord is on thy side'] }],
      },
    });

    expect(findSongsWithDb(db, 'Be Still').map(s => s.title)).toContain('Be Still, My Soul');
    expect(findSongsWithDb(db, 'Hymns').map(s => s.number)).toContain('124');
    expect(findSongsWithDb(db, '124')[0]?.title).toBe('Be Still, My Soul');
    expect(findSongsWithDb(db, 'on thy side')[0]?.book).toBe('Hymns');
    expect(findSongsWithDb(db, 'no-such-song')).toEqual([]);
  });
});

