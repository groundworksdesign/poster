/**
 * Copy a local file or remote URL image into an embedded data URL so a deck
 * stays self-contained (REQ-008, REQ-009 / AC-007, AC-008).
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

export function isDataUrl(value: string): boolean {
  return DATA_URL_RE.test(value.trim());
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

/** Embed a local File/Blob as a data URL. */
export async function embedImageFromFile(file: Blob): Promise<EmbedImageResult> {
  try {
    if (!file || file.size === 0) {
      return { ok: false, error: 'The selected file is empty.' };
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
 * Fetch a URL and embed the response body as a data URL.
 * Already-embedded data URLs are returned as-is.
 * On any failure, returns ok:false with an error string (caller must leave the field empty).
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
    const res = await fetchImpl(trimmed, { method: 'GET', mode: 'cors', credentials: 'omit' });
    if (!res.ok) {
      return { ok: false, error: `Could not download the image (HTTP ${res.status}).` };
    }
    const blob = await res.blob();
    if (!blob || blob.size === 0) {
      return { ok: false, error: 'The URL did not return an image.' };
    }
    const mime = blob.type || res.headers.get('content-type') || '';
    if (mime && !mime.startsWith('image/') && !mime.startsWith('application/octet-stream')) {
      return { ok: false, error: 'The URL did not return an image.' };
    }
    const dataUrl = await blobToDataUrl(blob);
    return { ok: true, dataUrl, mimeType: mime || undefined };
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
 * existing string so in-memory references stay shared. JSON may still repeat the
 * value when multiple overrides embed the same bytes; inheritance avoids the
 * common multi-slide duplication by keeping one deck default.
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
