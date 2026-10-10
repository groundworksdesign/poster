import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';
import { fetchImageBytesAsDataUrl } from '../../../domain/fetchImageBytes';
import {
  UNIFORM_IMAGE_FETCH_ERROR,
  validateFetchImageRequestHeaders,
} from '../../../domain/ssrfGuard';

/**
 * POST { url: string } → EmbedImageResult
 * Server-side fetch so renderer CORS cannot block image URL import (REQ-008).
 *
 * Security: application/json Content-Type + same-origin checks; SSRF guards in
 * fetchImageBytesAsDataUrl. Express must not parse this path's body (see
 * posterSessionRelay) or request.json() fails with a misleading empty-URL error.
 */
export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'POST required' }, { status: 405 });
  }
  const headerError = validateFetchImageRequestHeaders(request.headers);
  if (headerError) {
    return json({ ok: false, error: headerError }, { status: 400 });
  }
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    // Body missing/invalid — not "empty URL"; keep message uniform for parse failures
    // that are not simply a blank field.
    return json({ ok: false, error: UNIFORM_IMAGE_FETCH_ERROR }, { status: 400 });
  }
  if (typeof body.url !== 'string' || !body.url.trim()) {
    return json({ ok: false, error: 'Enter an image URL.' }, { status: 400 });
  }
  const result = await fetchImageBytesAsDataUrl(body.url);
  return json(result, { status: result.ok ? 200 : 400 });
};
