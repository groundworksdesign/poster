import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { processPresentEvent } = require('../../server/posterSessionRelay');

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method-not-allowed' }, { status: 405 });
  }
  let body: { peerId?: string; event?: { type: string; [key: string]: unknown } };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid-json' }, { status: 400 });
  }
  if (!body.peerId || !body.event) {
    return json({ ok: false, error: 'peerId-and-event-required' }, { status: 400 });
  }
  return json(processPresentEvent(body.peerId, body.event));
};
