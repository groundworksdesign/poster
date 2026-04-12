import Database from 'better-sqlite3';
import { initSchema } from '../../app/utils/schema.server';
import { upsertPresentationWithDb } from '../../app/utils/library.server';

function makeDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

const baseDeck = {
  title: 'Sunday Service',
  date: '2026-04-13',
  location: 'Main Hall',
  notes: '',
  useGreenScreen: false,
  slideStyles: {},
  slides: [],
};

describe('upsertPresentationWithDb', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = makeDb();
  });

  afterEach(() => {
    db.close();
  });

  it('inserts a new row when no id is provided', () => {
    const id = upsertPresentationWithDb(db, baseDeck);
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);

    const rows = db.prepare('SELECT id, title FROM presentations').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(id);
    expect(rows[0].title).toBe('Sunday Service');
  });

  it('returns the same id and updates instead of inserting on a second save', () => {
    const id = upsertPresentationWithDb(db, baseDeck);
    const updatedDeck = { ...baseDeck, id, title: 'Sunday Service (updated)' };
    const id2 = upsertPresentationWithDb(db, updatedDeck);

    expect(id2).toBe(id);

    const rows = db.prepare('SELECT id, title FROM presentations').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Sunday Service (updated)');
  });

  it('inserts a new row when the provided id does not exist', () => {
    const id = upsertPresentationWithDb(db, { ...baseDeck, id: 'nonexistent-id' });
    expect(id).not.toBe('nonexistent-id');

    const rows = db.prepare('SELECT id FROM presentations').all() as any[];
    expect(rows).toHaveLength(1);
  });

  it('stores the full deck JSON in deck_json column', () => {
    const id = upsertPresentationWithDb(db, baseDeck);
    const row = db.prepare('SELECT deck_json FROM presentations WHERE id = ?').get(id) as any;
    const parsed = JSON.parse(row.deck_json);
    expect(parsed.title).toBe('Sunday Service');
  });

  it('updates deck_json on update', () => {
    const id = upsertPresentationWithDb(db, baseDeck);
    upsertPresentationWithDb(db, { ...baseDeck, id, notes: 'updated notes' });

    const row = db.prepare('SELECT deck_json FROM presentations WHERE id = ?').get(id) as any;
    const parsed = JSON.parse(row.deck_json);
    expect(parsed.notes).toBe('updated notes');
  });
});
