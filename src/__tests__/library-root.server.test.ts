import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  migrateLegacyLibrary,
  readLibraryRoot,
  resolveLibraryRoot,
  resolvePosterHome,
  writeLibraryRoot,
} from '../../app/utils/library-root.server';

describe('durable library root', () => {
  it('defaults to HOME/.poster and supports a tilde path', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    expect(resolvePosterHome({}, home)).toBe(path.join(home, '.poster'));
    expect(resolveLibraryRoot({ POSTER_LIBRARY_PATH: '~/.custom-poster' }, home)).toBe(
      path.join(home, '.custom-poster'),
    );
  });

  it('migrates legacy SQLite once and leaves the source untouched', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-cwd-'));
    const root = path.join(home, '.poster');
    const source = path.join(cwd, 'poster.sqlite');
    fs.writeFileSync(source, 'legacy sqlite');

    migrateLegacyLibrary(root, cwd, { POSTER_HOME: home });
    expect(fs.readFileSync(path.join(root, 'poster.sqlite'), 'utf8')).toBe('legacy sqlite');
    expect(fs.existsSync(source)).toBe(true);

    fs.writeFileSync(source, 'changed source');
    migrateLegacyLibrary(root, cwd, { POSTER_HOME: home });
    expect(fs.readFileSync(path.join(root, 'poster.sqlite'), 'utf8')).toBe('legacy sqlite');
  });

  it('copies SQLite WAL sidecars during migration', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-cwd-'));
    const root = path.join(home, '.poster');
    const source = path.join(cwd, 'poster.sqlite');
    fs.writeFileSync(source, 'database');
    fs.writeFileSync(`${source}-wal`, 'wal');
    fs.writeFileSync(`${source}-shm`, 'shm');

    migrateLegacyLibrary(root, cwd, { POSTER_HOME: home });

    expect(fs.readFileSync(path.join(root, 'poster.sqlite-wal'), 'utf8')).toBe('wal');
    expect(fs.readFileSync(path.join(root, 'poster.sqlite-shm'), 'utf8')).toBe('shm');
  });

  it('migrates legacy JSON once when no destination data exists', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-cwd-'));
    const root = path.join(home, '.poster');
    const source = path.join(cwd, 'poster.library.json');
    fs.writeFileSync(source, JSON.stringify({ presentations: [{ id: 'legacy-1' }] }));

    migrateLegacyLibrary(root, cwd, { POSTER_HOME: home });

    expect(fs.readFileSync(path.join(root, 'poster.library.json'), 'utf8')).toContain('legacy-1');
    expect(fs.existsSync(source)).toBe(true);
    expect(fs.existsSync(path.join(home, '.poster-library-migrated'))).toBe(true);

    fs.writeFileSync(source, JSON.stringify({ presentations: [{ id: 'changed' }] }));
    migrateLegacyLibrary(root, cwd, { POSTER_HOME: home });
    expect(fs.readFileSync(path.join(root, 'poster.library.json'), 'utf8')).toContain('legacy-1');
    expect(fs.readFileSync(path.join(root, 'poster.library.json'), 'utf8')).not.toContain('changed');
  });

  it('does not overwrite populated destination data during migration', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-cwd-'));
    const root = path.join(home, '.poster');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'poster.library.json'), JSON.stringify({ presentations: [{ id: 'new' }] }));
    fs.writeFileSync(path.join(cwd, 'poster.library.json'), JSON.stringify({ presentations: [{ id: 'old' }] }));

    migrateLegacyLibrary(root, cwd, { POSTER_HOME: home });

    const destination = fs.readFileSync(path.join(root, 'poster.library.json'), 'utf8');
    expect(destination).toContain('new');
    expect(destination).not.toContain('old');
  });

  it('does not copy legacy data when either destination format is populated', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-cwd-'));
    const root = path.join(home, '.poster');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'poster.sqlite'), 'current database');
    fs.writeFileSync(path.join(cwd, 'poster.library.json'), JSON.stringify({ presentations: [{ id: 'old' }] }));

    migrateLegacyLibrary(root, cwd, { POSTER_HOME: home });

    expect(fs.existsSync(path.join(root, 'poster.library.json'))).toBe(false);
    expect(fs.readFileSync(path.join(root, 'poster.sqlite'), 'utf8')).toBe('current database');
  });

  it('marks migration complete even when there is no legacy source', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const root = path.join(home, '.poster');

    migrateLegacyLibrary(root, path.join(home, 'missing-cwd'), { POSTER_HOME: home });

    expect(fs.existsSync(path.join(home, '.poster-library-migrated'))).toBe(true);
  });

  it('does not migrate when an explicit database or JSON path is configured', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-cwd-'));
    const root = path.join(home, '.poster');
    fs.writeFileSync(path.join(cwd, 'poster.sqlite'), 'legacy');

    migrateLegacyLibrary(root, cwd, { POSTER_HOME: home, POSTER_DB_PATH: '/custom/poster.sqlite' });
    expect(fs.existsSync(path.join(root, 'poster.sqlite'))).toBe(false);
    expect(fs.existsSync(path.join(home, '.poster-library-migrated'))).toBe(false);

    migrateLegacyLibrary(root, cwd, { POSTER_HOME: home, POSTER_LIBRARY_JSON_PATH: '/custom/library.json' });
    expect(fs.existsSync(path.join(root, 'poster.sqlite'))).toBe(false);
  });

  it('re-points settings without moving the previous folder', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const oldRoot = path.join(home, '.poster');
    const newRoot = path.join(home, 'new-library');
    fs.mkdirSync(oldRoot, { recursive: true });
    fs.writeFileSync(path.join(oldRoot, 'poster.sqlite'), 'keep me');

    const previousHome = process.env.POSTER_HOME;
    process.env.POSTER_HOME = home;
    try {
      expect(writeLibraryRoot(newRoot)).toBe(newRoot);
      expect(readLibraryRoot()).toBe(newRoot);
      expect(fs.readFileSync(path.join(oldRoot, 'poster.sqlite'), 'utf8')).toBe('keep me');
    } finally {
      if (previousHome === undefined) delete process.env.POSTER_HOME;
      else process.env.POSTER_HOME = previousHome;
    }
  });

  it('rejects a file path when changing the library root', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const filePath = path.join(home, 'not-a-directory');
    fs.writeFileSync(filePath, 'not a directory');
    const previousHome = process.env.POSTER_HOME;
    process.env.POSTER_HOME = home;
    try {
      expect(() => writeLibraryRoot(filePath)).toThrow('Library path must be a directory');
    } finally {
      if (previousHome === undefined) delete process.env.POSTER_HOME;
      else process.env.POSTER_HOME = previousHome;
    }
  });

  it('rejects empty settings paths and paths whose parent is a file', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const parentFile = path.join(home, 'not-a-parent-directory');
    fs.writeFileSync(parentFile, 'not a directory');
    const previousHome = process.env.POSTER_HOME;
    process.env.POSTER_HOME = home;
    try {
      expect(() => writeLibraryRoot('   ')).toThrow('Library path is required');
      expect(() => writeLibraryRoot(path.join(parentFile, 'library'))).toThrow();
    } finally {
      if (previousHome === undefined) delete process.env.POSTER_HOME;
      else process.env.POSTER_HOME = previousHome;
    }
  });

  it('uses the durable default when settings are malformed or contain an invalid value', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const settingsPath = path.join(home, '.poster', 'library-settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

    fs.writeFileSync(settingsPath, '{not json');
    expect(resolveLibraryRoot({}, home)).toBe(path.join(home, '.poster'));

    fs.writeFileSync(settingsPath, JSON.stringify({ libraryRoot: '   ' }));
    expect(resolveLibraryRoot({}, home)).toBe(path.join(home, '.poster'));

    fs.writeFileSync(settingsPath, JSON.stringify({ libraryRoot: 42 }));
    expect(resolveLibraryRoot({}, home)).toBe(path.join(home, '.poster'));
  });

  it('falls back when persisted settings point to an existing file', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const settingsPath = path.join(home, '.poster', 'library-settings.json');
    const filePath = path.join(home, 'not-a-library-directory');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(filePath, 'not a directory');
    fs.writeFileSync(settingsPath, JSON.stringify({ libraryRoot: filePath }));

    const resolved = resolveLibraryRoot({}, home);
    expect(resolved).toBe(path.join(home, '.poster'));
    expect(() => migrateLegacyLibrary(resolved, path.join(home, 'cwd'), { POSTER_HOME: home })).not.toThrow();
  });

  it('prefers an explicit environment path over persisted settings', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-home-'));
    const configured = path.join(home, 'configured');
    const override = path.join(home, 'override');
    fs.mkdirSync(path.join(home, '.poster'), { recursive: true });
    fs.writeFileSync(
      path.join(home, '.poster', 'library-settings.json'),
      JSON.stringify({ libraryRoot: configured }),
    );

    expect(resolveLibraryRoot({ POSTER_LIBRARY_PATH: override }, home)).toBe(override);
  });
});
