import { json } from '@remix-run/node';
import type { LoaderFunction } from '@remix-run/node';
import db from '../utils/db.server';

export const loader: LoaderFunction = ({ params }) => {
  const id = params.id;
  if (!id) {
    return json({ error: 'Missing id' }, { status: 400 });
  }

  const row = db.prepare('SELECT deck_json FROM presentations WHERE id = ?').get(id) as
    | { deck_json: string }
    | undefined;

  if (!row) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  return json(JSON.parse(row.deck_json));
};

export default function OpenRoute() {
  return null;
}
