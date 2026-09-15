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
});
