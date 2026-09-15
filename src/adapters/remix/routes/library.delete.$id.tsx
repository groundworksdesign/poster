import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import { tryGetSqliteDb } from '../../persistence/db.server';
import * as jsonLibrary from '../../persistence/library-json.server';

export const action: ActionFunction = ({ params }) => {
  const id = params.id;
  if (!id) {
    return json({ error: 'Missing id' }, { status: 400 });
  }

  const sqlite = tryGetSqliteDb();
  if (sqlite) {
    const result = sqlite.prepare('DELETE FROM presentations WHERE id = ?').run(id);
    if (result.changes === 0) {
      return json({ error: 'Not found' }, { status: 404 });
    }
    return json({ ok: true });
  }

  if (!jsonLibrary.jsonLibraryDelete(id)) {
    return json({ error: 'Not found' }, { status: 404 });
  }
  return json({ ok: true });
};

export default function DeleteRoute() {
  return null;
}
