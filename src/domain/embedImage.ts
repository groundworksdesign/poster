/**
 * Copy a local file or remote URL image into an embedded data URL so a deck
 * stays self-contained (REQ-008, REQ-009 / AC-007, AC-008).
 *
 * URL downloads go through the Remix/Electron server proxy so hosts without
 * CORS headers still work (Iris REQ-008).
 */

export type EmbedImageSuccess = {
  ok: true;
  dataUrl: string;
  /** MIME type when known. */
  mimeType?: string;
};

export type EmbedImageFailure = {
  ok: false;
  error: string;
};

export type EmbedImageResult = EmbedImageSuccess | EmbedImageFailure;

const DATA_URL_RE = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+)?(;base64)?,/i;

/** Client path for the server-side image fetch proxy. */
export const FETCH_IMAGE_API_PATH = '/api/poster/fetch-image';

export function isDataUrl(value: string): boolean {
  return DATA_URL_RE.test(value.trim());
}

export function isImageFile(file: Blob & { type?: string; name?: string }): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  // Some environments omit type; fall back to extension.
  const name = typeof (file as File).name === 'string' ? (file as File).name : '';
  return /\.(png|jpe?g|gif|webp|bmp|svg|ico|avif)$/i.test(name);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read image data.'));
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read image data.'));
    reader.readAsDataURL(blob);
  });
}

/** Embed a local File/Blob as a data URL. Rejects non-image types (N5). */
export async function embedImageFromFile(file: Blob): Promise<EmbedImageResult> {
  try {
    if (!file || file.size === 0) {
      return { ok: false, error: 'The selected file is empty.' };
    }
    if (!isImageFile(file)) {
      return { ok: false, error: 'Please choose an image file.' };
    }
    const dataUrl = await blobToDataUrl(file);
    return {
      ok: true,
      dataUrl,
      mimeType: file.type || undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not read the image file.';
    return { ok: false, error: message };
  }
}

/**
 * Fetch a URL via the server proxy and embed as a data URL.
 * Already-embedded data URLs are returned as-is.
 * On any failure, returns ok:false (caller must NOT wipe an existing image — N1).
 */
export async function embedImageFromUrl(
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
    const res = await fetchImpl(FETCH_IMAGE_API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ url: trimmed }),
    });
    let body: EmbedImageResult | null = null;
    try {
      body = (await res.json()) as EmbedImageResult;
    } catch {
      body = null;
    }
    if (body && typeof body.ok === 'boolean') {
      return body;
    }
    return {
      ok: false,
      error: `Could not download the image (HTTP ${res.status}).`,
    };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? `Could not download the image: ${err.message}`
        : 'Could not download the image.';
    return { ok: false, error: message };
  }
}

/**
 * If `dataUrl` already appears on the deck (default or any slide), return that
 * existing string so in-memory references stay shared.
 */
export function findExistingEmbeddedImage(
  dataUrl: string,
  candidates: Array<string | undefined | null>
): string {
  for (const c of candidates) {
    if (typeof c === 'string' && c === dataUrl) return c;
  }
  return dataUrl;
}
