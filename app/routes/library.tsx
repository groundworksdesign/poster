import { json } from '@remix-run/node';
import type { LoaderFunction } from '@remix-run/node';
import db from '../utils/db.server';
import type { PresentationRow } from '../utils/schema.server';

export type LibraryEntry = Pick<PresentationRow, 'id' | 'title' | 'date' | 'location' | 'created_at'>;

export const loader: LoaderFunction = () => {
  const rows = db
    .prepare(
      `SELECT id, title, date, location, created_at
       FROM presentations
       ORDER BY created_at DESC`,
    )
    .all() as LibraryEntry[];

  return json(rows);
};

export default function LibraryPage() {
  return <div>Library (coming soon)</div>;
}
