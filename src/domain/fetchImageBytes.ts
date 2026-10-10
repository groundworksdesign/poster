/**
 * Server-side image download (no browser CORS). Used by Remix/Electron proxy.
 * Validates http(s), content-type, and size before returning a data URL.
 */

import type { EmbedImageResult } from './embedImage';
import { isDataUrl } from './embedImage';

/** Max embedded image body size (bytes). */
export const MAX_EMBEDDED_IMAGE_BYTES = 8 * 1024 * 1024;

function contentTypeIsImage(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const mime = contentType.split(';')[0].trim().toLowerCase();
  return mime.startsWith('image/');
}

/**
 * Fetch an image URL from Node (or any non-CORS-restricted environment)
 * and return an embedded data URL.
 */
export async function fetchImageBytesAsDataUrl(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<EmbedImageResult> {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter an image URL.' };
  }
  if (isDataUrl(trimmed)) {
    return { ok: true, dataUrl: trimmed };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'That URL is not valid.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https image URLs are supported.' };
  }

  try {
    const res = await fetchImpl(trimmed, {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'image/*,*/*;q=0.8' },
    });
    if (!res.ok) {
      return { ok: false, error: `Could not download the image (HTTP ${res.status}).` };
    }
    const contentType = res.headers.get('content-type');
    if (!contentTypeIsImage(contentType)) {
      return { ok: false, error: 'The URL did not return an image.' };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) {
      return { ok: false, error: 'The URL did not return an image.' };
    }
    if (buf.length > MAX_EMBEDDED_IMAGE_BYTES) {
      return {
        ok: false,
        error: `Image is too large (max ${Math.floor(MAX_EMBEDDED_IMAGE_BYTES / (1024 * 1024))} MB).`,
      };
    }
    const mime = (contentType || 'image/png').split(';')[0].trim().toLowerCase();
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
    return { ok: true, dataUrl, mimeType: mime };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? `Could not download the image: ${err.message}`
        : 'Could not download the image.';
    return { ok: false, error: message };
  }
}
