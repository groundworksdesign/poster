import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { putAsset } = require('../../realtime/posterSessionRelay');

/** POST { hash, dataUrl } — store bytes for Present asset URLs (browser send path). */
export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method-not-allowed' }, { status: 405 });
  }
  const ct = (request.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json')) {
    return json({ ok: false, error: 'forbidden' }, { status: 400 });
  }
  let body: { hash?: string; dataUrl?: string };
  try {
    body = (await request.json()) as { hash?: string; dataUrl?: string };
  } catch {
    return json({ ok: false, error: 'invalid-json' }, { status: 400 });
  }
  const result = putAsset(body.hash, body.dataUrl);
  return json(result, { status: result.ok ? 200 : 400 });
};
