import { json } from '@remix-run/node';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { readLibraryRoot, writeLibraryRoot } from '../../persistence/library-root.server';
import { setLibraryDbPath } from '../../persistence/db.server';
import { setLibraryJsonPath } from '../../persistence/library-json.server';

export const loader: LoaderFunction = () => json({ libraryRoot: readLibraryRoot() });

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  let body: { libraryRoot?: unknown };
  try {
    body = (await request.json()) as { libraryRoot?: unknown };
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.libraryRoot !== 'string' || !body.libraryRoot.trim()) {
    return json({ error: 'Library path is required' }, { status: 400 });
  }

  try {
    const root = writeLibraryRoot(body.libraryRoot);
    setLibraryDbPath(root);
    setLibraryJsonPath(root);
    return json({ ok: true, libraryRoot: root });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid library path' }, { status: 400 });
  }
};

export default function LibrarySettingsRoute() {
  return null;
}
