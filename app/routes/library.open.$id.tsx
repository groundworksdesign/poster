import { json } from '@remix-run/node';
import type { LoaderFunction } from '@remix-run/node';
import { tryGetSqliteDb } from '../utils/db.server';
import * as jsonLibrary from '../utils/library-json.server';

export const loader: LoaderFunction = ({ params }) => {
  const id = params.id;
  if (!id) {
    return json({ error: 'Missing id' }, { status: 400 });
  }

  const sqlite = tryGetSqliteDb();
  if (sqlite) {
    const row = sqlite.prepare('SELECT deck_json FROM presentations WHERE id = ?').get(id) as
      | { deck_json: string }
      | undefined;
    if (!row) {
      return json({ error: 'Not found' }, { status: 404 });
    }
    return json(JSON.parse(row.deck_json));
  }

  const deckJson = jsonLibrary.jsonLibraryGetDeckJson(id);
  if (!deckJson) {
    return json({ error: 'Not found' }, { status: 404 });
  }
  return json(JSON.parse(deckJson));
};

export default function OpenRoute() {
  return null;
}
