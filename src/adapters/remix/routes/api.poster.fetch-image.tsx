import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import { fetchImageBytesAsDataUrl } from '../../../domain/fetchImageBytes';

/**
 * POST { url: string } → EmbedImageResult
 * Server-side fetch so renderer CORS cannot block image URL import (REQ-008).
 */
export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'POST required' }, { status: 405 });
  }
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return json({ ok: false, error: 'Enter an image URL.' }, { status: 400 });
  }
  const result = await fetchImageBytesAsDataUrl(typeof body.url === 'string' ? body.url : '');
  return json(result, { status: result.ok ? 200 : 400 });
};
