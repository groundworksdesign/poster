import type { LoaderFunction } from '@remix-run/node';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createSseResponse } = require('../../realtime/posterSessionRelay');

export const loader: LoaderFunction = ({ request }) => {
  const url = new URL(request.url);
  const peerId = url.searchParams.get('peerId');
  if (!peerId) {
    return new Response('peerId required', { status: 400 });
  }
  return createSseResponse(peerId, 'present');
};
