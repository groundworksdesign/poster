import { json } from '@remix-run/node';
import type { LoaderFunction } from '@remix-run/node';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { drainQueue } = require('../../server/posterSessionRelay');

export const loader: LoaderFunction = ({ request }) => {
  const url = new URL(request.url);
  const peerId = url.searchParams.get('peerId');
  if (!peerId) {
    return json({ ok: false, error: 'peerId-required' }, { status: 400 });
  }
  return json({ ok: true, messages: drainQueue(peerId) });
};
