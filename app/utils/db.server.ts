import Database from 'better-sqlite3';
import path from 'path';
import { initSchema } from './schema.server';

const dbPath = process.env.POSTER_DB_PATH
  ? process.env.POSTER_DB_PATH
  : path.join(process.cwd(), 'poster.sqlite');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

initSchema(db);

export default db;
