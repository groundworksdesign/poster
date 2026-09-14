import { json } from '@remix-run/node';
import type { LoaderFunction } from '@remix-run/node';
import { tryGetSqliteDb } from '../../persistence/db.server';
import * as jsonLibrary from '../../persistence/library-json.server';
import type { PresentationRow } from '../../persistence/schema.server';

export type LibraryEntry = Pick<PresentationRow, 'id' | 'title' | 'date' | 'location' | 'created_at'>;

function normalizeRows(rows: Array<{ id: string; title: string; date: string | null; location: string | null; created_at: string }>) {
  return rows.map(r => ({
    ...r,
    date: r.date ?? '',
    location: r.location ?? '',
  }));
}

export const loader: LoaderFunction = () => {
  const sqlite = tryGetSqliteDb();
  if (sqlite) {
    const rows = sqlite
      .prepare(
        `SELECT id, title, date, location, created_at
         FROM presentations
         ORDER BY created_at DESC`,
      )
      .all() as LibraryEntry[];
    return json(normalizeRows(rows as any));
  }

  return json(normalizeRows(jsonLibrary.jsonLibraryList() as any));
};

export default function LibraryPage() {
  return <div>Library (coming soon)</div>;
}
