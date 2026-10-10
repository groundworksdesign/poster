import type { LoaderFunction } from '@remix-run/node';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getAsset } = require('../../realtime/posterSessionRelay');

/** GET /api/poster/asset/:hash — image bytes for Present background layers. */
export const loader: LoaderFunction = async ({ params }) => {
  const hash = params.hash;
  if (!hash) {
    return new Response(null, { status: 404 });
  }
  const asset = getAsset(hash);
  if (!asset) {
    return new Response(null, { status: 404 });
  }
  return new Response(asset.bytes, {
    status: 200,
    headers: {
      'Content-Type': asset.mime,
      'Cache-Control': 'private, max-age=3600',
    },
  });
};
