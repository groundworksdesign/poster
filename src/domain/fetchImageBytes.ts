/**
 * Server-side image download (no browser CORS). Used by Remix/Electron proxy.
 * SSRF-hardened: DNS + redirect address checks, connect/total timeouts,
 * streaming size cap (8 MB), uniform errors.
 *
 * Loopback/private targets are blocked unless POSTER_ALLOW_LOOPBACK_FETCH=1
 * (e2e only — production must never set this).
 */

import http from 'node:http';
import https from 'node:https';
import type { EmbedImageResult } from './embedImage';
import { isDataUrl } from './embedImage';
import {
  isBlockedIp,
  resolvePublicAddress,
  UNIFORM_IMAGE_FETCH_ERROR,
} from './ssrfGuard';

/** Max embedded image body size (bytes) — Race: 8 MB streaming cap. */
export const MAX_EMBEDDED_IMAGE_BYTES = 8 * 1024 * 1024;

export const CONNECT_TIMEOUT_MS = 5_000;
export const TOTAL_TIMEOUT_MS = 15_000;
export const MAX_REDIRECTS = 5;

export { UNIFORM_IMAGE_FETCH_ERROR };

function contentTypeIsImage(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const mime = contentType.split(';')[0].trim().toLowerCase();
  return mime.startsWith('image/');
}

function allowLoopbackFetchTargets(): boolean {
  return process.env.POSTER_ALLOW_LOOPBACK_FETCH === '1';
}

async function resolveConnectAddress(hostname: string): Promise<string> {
  if (allowLoopbackFetchTargets()) {
    // E2E only: still resolve, but skip the private-address reject.
    const net = await import('node:net');
    if (net.isIP(hostname)) return hostname;
    const dns = await import('node:dns/promises');
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    if (!records.length) throw new Error('DNS_FAILED');
    return records[0].address;
  }
  return resolvePublicAddress(hostname);
}

type HopResult =
  | { kind: 'redirect'; location: string }
  | { kind: 'ok'; status: number; contentType: string | null; body: Buffer }
  | { kind: 'error' };

function requestOnce(
  targetUrl: URL,
  connectAddress: string,
  remainingMs: number
): Promise<HopResult> {
  const lib = targetUrl.protocol === 'https:' ? https : http;
  const port = targetUrl.port
    ? Number(targetUrl.port)
    : targetUrl.protocol === 'https:'
      ? 443
      : 80;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: HopResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = lib.request(
      {
        protocol: targetUrl.protocol,
        hostname: connectAddress,
        port,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method: 'GET',
        headers: {
          Host: targetUrl.host,
          Accept: 'image/*,*/*;q=0.8',
          Connection: 'close',
        },
        timeout: Math.min(CONNECT_TIMEOUT_MS, remainingMs),
        servername: targetUrl.hostname,
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          finish({ kind: 'redirect', location: String(res.headers.location) });
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          finish({ kind: 'error' });
          return;
        }
        const contentType =
          typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : null;
        if (!contentTypeIsImage(contentType)) {
          res.resume();
          finish({ kind: 'error' });
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_EMBEDDED_IMAGE_BYTES) {
            req.destroy();
            res.destroy();
            finish({ kind: 'error' });
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          if (settled) return;
          const body = Buffer.concat(chunks);
          if (body.length === 0) {
            finish({ kind: 'error' });
            return;
          }
          finish({ kind: 'ok', status, contentType, body });
        });
        res.on('error', () => finish({ kind: 'error' }));
      }
    );
    req.on('timeout', () => {
      req.destroy();
      finish({ kind: 'error' });
    });
    req.on('error', () => finish({ kind: 'error' }));
    const absoluteDeadline = setTimeout(() => {
      req.destroy();
      finish({ kind: 'error' });
    }, remainingMs);
    req.on('close', () => clearTimeout(absoluteDeadline));
    req.end();
  });
}

/**
 * Fetch an image URL from Node with SSRF protections and return a data URL.
 */
export async function fetchImageBytesAsDataUrl(url: string): Promise<EmbedImageResult> {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter an image URL.' };
  }
  if (isDataUrl(trimmed)) {
    return { ok: true, dataUrl: trimmed };
  }

  let current: URL;
  try {
    current = new URL(trimmed);
  } catch {
    return { ok: false, error: 'That URL is not valid.' };
  }
  if (current.protocol !== 'http:' && current.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https image URLs are supported.' };
  }

  const started = Date.now();
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const remaining = TOTAL_TIMEOUT_MS - (Date.now() - started);
      if (remaining <= 0) {
        return { ok: false, error: UNIFORM_IMAGE_FETCH_ERROR };
      }
      let address: string;
      try {
        address = await resolveConnectAddress(current.hostname);
      } catch {
        return { ok: false, error: UNIFORM_IMAGE_FETCH_ERROR };
      }
      // Even with e2e loopback allow, never follow a redirect into metadata/private
      // unless the *current* hop itself is the allowed loopback case for first-party tests.
      if (!allowLoopbackFetchTargets() && isBlockedIp(address)) {
        return { ok: false, error: UNIFORM_IMAGE_FETCH_ERROR };
      }
      if (allowLoopbackFetchTargets() && isBlockedIp(address)) {
        // Allow only loopback (127/8, ::1), not metadata / RFC1918, during e2e.
        const isLoop =
          address === '::1' ||
          address.startsWith('127.') ||
          address === '::ffff:127.0.0.1';
        if (!isLoop) {
          return { ok: false, error: UNIFORM_IMAGE_FETCH_ERROR };
        }
      }

      const hopResult = await requestOnce(current, address, remaining);
      if (hopResult.kind === 'ok') {
        const mime = (hopResult.contentType || 'image/png').split(';')[0].trim().toLowerCase();
        return {
          ok: true,
          dataUrl: `data:${mime};base64,${hopResult.body.toString('base64')}`,
          mimeType: mime,
        };
      }
      if (hopResult.kind === 'redirect') {
        let next: URL;
        try {
          next = new URL(hopResult.location, current);
        } catch {
          return { ok: false, error: UNIFORM_IMAGE_FETCH_ERROR };
        }
        if (next.protocol !== 'http:' && next.protocol !== 'https:') {
          return { ok: false, error: UNIFORM_IMAGE_FETCH_ERROR };
        }
        // Re-check redirect target: never follow into metadata / RFC1918.
        // E2E may allow loopback hops only.
        try {
          const nextAddr = await resolveConnectAddress(next.hostname);
          if (isBlockedIp(nextAddr)) {
            const isLoop =
              nextAddr === '::1' ||
              nextAddr.startsWith('127.') ||
              nextAddr === '::ffff:127.0.0.1';
            if (!(allowLoopbackFetchTargets() && isLoop)) {
              return { ok: false, error: UNIFORM_IMAGE_FETCH_ERROR };
            }
          }
        } catch {
          return { ok: false, error: UNIFORM_IMAGE_FETCH_ERROR };
        }
        current = next;
        continue;
      }
      return { ok: false, error: UNIFORM_IMAGE_FETCH_ERROR };
    }
    return { ok: false, error: UNIFORM_IMAGE_FETCH_ERROR };
  } catch {
    return { ok: false, error: UNIFORM_IMAGE_FETCH_ERROR };
  }
}
