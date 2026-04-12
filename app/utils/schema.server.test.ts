import Database from 'better-sqlite3';
import { initSchema } from './schema.server';

test('initSchema creates presentations, songs, and assets tables', () => {
  const db = new Database(':memory:');
  initSchema(db as any);

  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const names = rows.map((r: any) => r.name);

  expect(names).toEqual(expect.arrayContaining(['presentations', 'songs', 'assets']));

  db.close();
});
