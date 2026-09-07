import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Deck } from '../../src/Present/PresentTypes';

describe('JSON library durability fallback', () => {
  const loadFresh = <T>(modulePath: string): T => {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
    return require(modulePath) as T;
  };

  it('keeps saved decks after the working directory is removed using the durable default root', () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-json-library-'));
    const home = path.join(sandbox, 'home');
    const cwd = path.join(sandbox, 'cwd');
    fs.mkdirSync(cwd, { recursive: true });

    const previousHome = process.env.HOME;
    const previousPosterHome = process.env.POSTER_HOME;
    const previousLibraryPath = process.env.POSTER_LIBRARY_PATH;
    const previousDbPath = process.env.POSTER_DB_PATH;
    const previousJsonPath = process.env.POSTER_LIBRARY_JSON_PATH;
    const previousCwd = process.cwd();

    process.env.HOME = home;
    delete process.env.POSTER_HOME;
    delete process.env.POSTER_LIBRARY_PATH;
    delete process.env.POSTER_DB_PATH;
    delete process.env.POSTER_LIBRARY_JSON_PATH;
    process.chdir(cwd);
    jest.resetModules();

    try {
      const rootModule = loadFresh<typeof import('../../app/utils/library-root.server')>('../../app/utils/library-root.server');
      const explicitEnv: Record<string, string | undefined> = {
        HOME: home,
        USERPROFILE: home,
        POSTER_HOME: undefined,
        POSTER_LIBRARY_PATH: undefined,
        POSTER_DB_PATH: undefined,
        POSTER_LIBRARY_JSON_PATH: undefined,
      };
      const defaultRoot = path.join(home, '.poster');
      expect(rootModule.resolveLibraryRoot(explicitEnv, home)).toBe(defaultRoot);
      rootModule.writeLibraryRoot(defaultRoot);

      const jsonLibrary = loadFresh<typeof import('../../app/utils/library-json.server')>('../../app/utils/library-json.server');
      jsonLibrary.setLibraryJsonPath(defaultRoot);
      const deck: Deck = {
        title: 'JSON durable presentation',
        date: '2026-09-06',
        location: 'Main stage',
        notes: '',
        useGreenScreen: false,
        slideStyles: {},
        slides: [],
      };

      const id = jsonLibrary.jsonLibraryUpsert(deck);
      const jsonPath = path.join(defaultRoot, 'poster.library.json');
      expect(fs.existsSync(jsonPath)).toBe(true);
      expect(jsonLibrary.jsonLibraryList()).toEqual([
        expect.objectContaining({ id, title: deck.title }),
      ]);

      fs.rmSync(cwd, { recursive: true, force: true });
      jest.resetModules();

      const reloadedJson = loadFresh<typeof import('../../app/utils/library-json.server')>('../../app/utils/library-json.server');
      reloadedJson.setLibraryJsonPath(defaultRoot);
      expect(reloadedJson.jsonLibraryGetDeckJson(id)).toContain(deck.title);
      expect(reloadedJson.jsonLibraryList()).toEqual([
        expect.objectContaining({ id, title: deck.title }),
      ]);
    } finally {
      process.chdir(previousCwd);
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousPosterHome === undefined) delete process.env.POSTER_HOME;
      else process.env.POSTER_HOME = previousPosterHome;
      if (previousLibraryPath === undefined) delete process.env.POSTER_LIBRARY_PATH;
      else process.env.POSTER_LIBRARY_PATH = previousLibraryPath;
      if (previousDbPath === undefined) delete process.env.POSTER_DB_PATH;
      else process.env.POSTER_DB_PATH = previousDbPath;
      if (previousJsonPath === undefined) delete process.env.POSTER_LIBRARY_JSON_PATH;
      else process.env.POSTER_LIBRARY_JSON_PATH = previousJsonPath;
      jest.resetModules();
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
