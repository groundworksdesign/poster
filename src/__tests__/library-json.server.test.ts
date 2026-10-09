import fs from 'fs';
import os from 'os';
import path from 'path';

describe('library-json.server', () => {
  const tmpPath = path.join(os.tmpdir(), `poster-lib-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  let jsonLib: typeof import('../adapters/persistence/library-json.server');

  beforeAll(() => {
    process.env.POSTER_LIBRARY_JSON_PATH = tmpPath;
    jest.isolateModules(() => {
      jsonLib = require('../adapters/persistence/library-json.server');
    });
  });

  afterAll(() => {
    delete process.env.POSTER_LIBRARY_JSON_PATH;
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  });

  beforeEach(() => {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  });

  const baseDeck = {
    title: 'Test Deck',
    date: '2026-04-18',
    location: 'Hall',
    notes: '',
    useGreenScreen: false,
    slideStyles: {},
    slides: [],
  };

  it('upserts and lists presentations', () => {
    const id = jsonLib.jsonLibraryUpsert(baseDeck);
    expect(id.length).toBeGreaterThan(0);
    const list = jsonLib.jsonLibraryList();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('Test Deck');
  });

  it('updates when id exists', () => {
    const id = jsonLib.jsonLibraryUpsert({ ...baseDeck, title: 'First' });
    jsonLib.jsonLibraryUpsert({ ...baseDeck, id, title: 'Second' });
    const list = jsonLib.jsonLibraryList();
    expect(list.filter(e => e.id === id)).toHaveLength(1);
    expect(list.find(e => e.id === id)?.title).toBe('Second');
  });

  it('returns deck JSON for open', () => {
    const id = jsonLib.jsonLibraryUpsert({ ...baseDeck, title: 'Open Me' });
    const raw = jsonLib.jsonLibraryGetDeckJson(id);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).title).toBe('Open Me');
  });

  it('deletes by id', () => {
    const id = jsonLib.jsonLibraryUpsert({ ...baseDeck, title: 'Delete Me' });
    expect(jsonLib.jsonLibraryDelete(id)).toBe(true);
    expect(jsonLib.jsonLibraryGetDeckJson(id)).toBeNull();
  });

  it('lists zero songs on a fresh JSON library (AC-001)', () => {
    expect(jsonLib.jsonLibraryListSongs()).toEqual([]);
  });

  it('upserts a song with title, book, number, and lyrics', () => {
    const id = jsonLib.jsonLibraryUpsertSong({
      title: 'I Am a Child of God',
      book: 'Children’s Songbook',
      number: '2',
      lyrics: {
        title: 'I Am a Child of God',
        verses: [{ number: 1, lines: ['I am a child of God'] }],
      },
    });
    expect(id.length).toBeGreaterThan(0);
    const list = jsonLib.jsonLibraryListSongs();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('I Am a Child of God');
    expect(list[0].book).toBe('Children’s Songbook');
    expect(list[0].number).toBe('2');
    expect(list[0].lyrics.verses[0].lines[0]).toContain('child of God');
  });

  it('finds a hand-added song later (AC-002)', () => {
    jsonLib.jsonLibraryUpsertSong({
      title: 'Hand Song',
      book: 'Hymns',
      number: '9',
      lyrics: {
        title: 'Hand Song',
        verses: [{ number: 1, lines: ['Unique lyric phrase xyz'] }],
      },
    });
    expect(jsonLib.jsonLibraryFindSongs('Hand Song')).toHaveLength(1);
    expect(jsonLib.jsonLibraryFindSongs('Unique lyric phrase xyz')[0]?.number).toBe('9');
  });

  it('restore of pre-epic JSON (no songs key) keeps existing songs and restores decks', () => {
    const songId = jsonLib.jsonLibraryUpsertSong({
      title: 'Keep Me',
      book: 'Hymns',
      number: '1',
      lyrics: { title: 'Keep Me', verses: [{ number: 1, lines: ['stay'] }] },
    });
    jsonLib.jsonLibraryUpsert({ ...baseDeck, title: 'Old Deck' });

    const preEpicBackup = JSON.stringify({
      presentations: [
        {
          id: 'restored-deck-1',
          title: 'Restored Deck',
          date: null,
          location: null,
          notes: null,
          use_green_screen: 0,
          deck_json: JSON.stringify({ ...baseDeck, title: 'Restored Deck' }),
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    jsonLib.replaceLibraryFromJsonText(preEpicBackup);

    const songs = jsonLib.jsonLibraryListSongs();
    expect(songs).toHaveLength(1);
    expect(songs[0].id).toBe(songId);
    expect(songs[0].title).toBe('Keep Me');

    const decks = jsonLib.jsonLibraryList();
    expect(decks).toHaveLength(1);
    expect(decks[0].id).toBe('restored-deck-1');
    expect(decks[0].title).toBe('Restored Deck');
  });

  it('restore of JSON backup that includes songs replaces the song library', () => {
    jsonLib.jsonLibraryUpsertSong({
      title: 'Old Song',
      book: 'Hymns',
      number: '1',
      lyrics: { title: 'Old Song', verses: [{ number: 1, lines: ['old'] }] },
    });

    const backupWithSongs = JSON.stringify({
      presentations: [
        {
          id: 'deck-with-songs',
          title: 'Deck B',
          date: null,
          location: null,
          notes: null,
          use_green_screen: 0,
          deck_json: JSON.stringify({ ...baseDeck, title: 'Deck B' }),
          created_at: '2026-01-02T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        },
      ],
      songs: [
        {
          id: 'backup-song-1',
          title: 'From Backup',
          book: 'Hymns',
          number: '42',
          author: null,
          song_json: JSON.stringify({
            title: 'From Backup',
            verses: [{ number: 1, lines: ['new'] }],
          }),
          created_at: '2026-01-02T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        },
      ],
    });

    jsonLib.replaceLibraryFromJsonText(backupWithSongs);

    const songs = jsonLib.jsonLibraryListSongs();
    expect(songs).toHaveLength(1);
    expect(songs[0].id).toBe('backup-song-1');
    expect(songs[0].title).toBe('From Backup');
    expect(jsonLib.jsonLibraryList()[0]?.title).toBe('Deck B');
  });

  it('restore of JSON backup with songs: [] clears the song library', () => {
    jsonLib.jsonLibraryUpsertSong({
      title: 'Wipe Me',
      book: 'Hymns',
      number: '3',
      lyrics: { title: 'Wipe Me', verses: [{ number: 1, lines: ['gone'] }] },
    });

    jsonLib.replaceLibraryFromJsonText(
      JSON.stringify({
        presentations: [
          {
            id: 'empty-songs-deck',
            title: 'Empty Songs Deck',
            date: null,
            location: null,
            notes: null,
            use_green_screen: 0,
            deck_json: JSON.stringify({ ...baseDeck, title: 'Empty Songs Deck' }),
            created_at: '2026-01-03T00:00:00.000Z',
            updated_at: '2026-01-03T00:00:00.000Z',
          },
        ],
        songs: [],
      }),
    );

    expect(jsonLib.jsonLibraryListSongs()).toEqual([]);
    expect(jsonLib.jsonLibraryList()[0]?.title).toBe('Empty Songs Deck');
  });
});


