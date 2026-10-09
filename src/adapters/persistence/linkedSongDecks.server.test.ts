import { SlideType } from '../../domain/PresentTypes';
import {
  applyLibraryDeleteToDeck,
  applyLibraryEditToDeck,
} from '../../domain/linkedSongUpdate';
import { initSchema } from './schema.server';
import { upsertPresentationWithDb } from './library.server';
import {
  getSongWithDb,
  listPresentationDeckRowsWithDb,
  upsertSongWithDb,
} from './songs.server';
import {
  createInMemorySqliteDb,
  sqliteDriversAvailable,
  type SqliteTestDb,
} from './sqliteTestDb';

const describeSqlite = sqliteDriversAvailable() ? describe : describe.skip;

const baseline = {
  title: 'Linked',
  verses: [{ number: 1, lines: ['Original line'] }],
};

describeSqlite('linkedSongDecks (AC-010, AC-013, AC-018)', () => {
  let db: SqliteTestDb;

  beforeEach(() => {
    db = createInMemorySqliteDb();
    initSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  function seed() {
    const songId = upsertSongWithDb(db, {
      id: 'song-1',
      title: 'Linked',
      lyrics: baseline,
    });
    const deckA = upsertPresentationWithDb(db, {
      title: 'Deck A',
      date: '',
      location: '',
      notes: '',
      useGreenScreen: false,
      slideStyles: {},
      slides: [
        {
          type: SlideType.SONG,
          title: 'Linked',
          style: {},
          lyrics: baseline,
          librarySongId: songId,
        },
        {
          type: SlideType.GENERAL,
          title: 'Stay',
          style: {},
        },
      ],
    } as any);
    const deckB = upsertPresentationWithDb(db, {
      title: 'Deck B',
      date: '',
      location: '',
      notes: '',
      useGreenScreen: false,
      slideStyles: {},
      slides: [
        {
          type: SlideType.SONG,
          title: 'Linked',
          style: {},
          lyrics: { title: 'Linked', verses: [{ number: 1, lines: ['Hand edit'] }] },
          librarySongId: songId,
        },
      ],
    } as any);
    const deckC = upsertPresentationWithDb(db, {
      title: 'Unlinked',
      date: '',
      location: '',
      notes: '',
      useGreenScreen: false,
      slideStyles: {},
      slides: [
        {
          type: SlideType.SONG,
          title: 'Linked',
          style: {},
          lyrics: baseline,
        },
      ],
    } as any);
    return { songId, deckA, deckB, deckC };
  }

  function deckOf(id: string) {
    const row = db.prepare('SELECT deck_json FROM presentations WHERE id = ?').get(id) as {
      deck_json: string;
    };
    return JSON.parse(row.deck_json);
  }

  it('lists only decks that link the song (legacy unlinked excluded)', () => {
    const { songId } = seed();
    const usage = listPresentationDeckRowsWithDb(db)
      .map(row => {
        const deck = JSON.parse(row.deck_json);
        const linked = (deck.slides || []).filter((s: { librarySongId?: string }) => s.librarySongId === songId);
        return { id: row.id, linked: linked.length, title: row.title };
      })
      .filter(u => u.linked > 0);
    expect(usage).toHaveLength(2);
    expect(usage.map(u => u.title).sort()).toEqual(['Deck A', 'Deck B']);
  });

  it('AC-010/013: edit updates selected deck; skips hand-edited; leaves unlinked', () => {
    const { songId, deckA, deckB, deckC } = seed();
    const newLyrics = { title: 'Linked', verses: [{ number: 1, lines: ['New library'] }] };

    const edited = applyLibraryEditToDeck(deckOf(deckA), songId, newLyrics, baseline, false);
    upsertPresentationWithDb(db, { ...edited.deck, id: deckA } as any);

    expect(deckOf(deckA).slides[0].lyrics.verses[0].lines[0]).toBe('New library');
    expect(deckOf(deckA).slides[1].title).toBe('Stay');
    expect(deckOf(deckB).slides[0].lyrics.verses[0].lines[0]).toBe('Hand edit');
    expect(deckOf(deckC).slides[0].librarySongId).toBeUndefined();
    expect(deckOf(deckC).slides[0].lyrics.verses[0].lines[0]).toBe('Original line');
  });

  it('delete removes linked slides only from selected decks; song row remains until deleted', () => {
    const { songId, deckA, deckB } = seed();
    const result = applyLibraryDeleteToDeck(deckOf(deckA), songId, baseline, true);
    upsertPresentationWithDb(db, { ...result.deck, id: deckA } as any);

    expect(deckOf(deckA).slides.map((s: { title: string }) => s.title)).toEqual(['Stay']);
    expect(deckOf(deckB).slides).toHaveLength(1);
    expect(deckOf(deckB).slides[0].librarySongId).toBe(songId);
    expect(getSongWithDb(db, songId)).not.toBeNull();
  });
});
