/**
 * SSRF helpers for the image URL proxy: block private/link-local/metadata
 * addresses after DNS resolution (and on every redirect hop).
 */

import dns from 'node:dns/promises';
import net from 'node:net';

/** Uniform client-facing error — do not leak port state or DNS details. */
export const UNIFORM_IMAGE_FETCH_ERROR = 'Could not download the image.';

export function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    const v = Number(p);
    if (v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

export function isBlockedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true;
  // Use >>> 0 so bitmask compares are unsigned (JS & is signed int32).
  const u = (mask: number, prefix: number) => ((n & mask) >>> 0) === (prefix >>> 0);
  // 0.0.0.0/8
  if (u(0xff000000, 0x00000000)) return true;
  // 127.0.0.0/8 loopback
  if (u(0xff000000, 0x7f000000)) return true;
  // 10.0.0.0/8
  if (u(0xff000000, 0x0a000000)) return true;
  // 172.16.0.0/12
  if (u(0xfff00000, 0xac100000)) return true;
  // 192.168.0.0/16
  if (u(0xffff0000, 0xc0a80000)) return true;
  // 169.254.0.0/16 link-local / metadata
  if (u(0xffff0000, 0xa9fe0000)) return true;
  // 100.64.0.0/10 CGNAT
  if (u(0xffc00000, 0x64400000)) return true;
  return false;
}

export function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  // IPv4-mapped ::ffff:x.x.x.x
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  // Unique local fc00::/7
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // Link-local fe80::/10
  if (/^fe[89ab]/.test(normalized)) return true;
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true;
}

/**
 * Resolve hostname (or pass through literal IP) and reject if any address is blocked.
 * Returns one connectable address that passed the check.
 */
export async function resolvePublicAddress(hostname: string): Promise<string> {
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error('BLOCKED_ADDRESS');
    }
    return hostname;
  }
  let records: Array<{ address: string; family: number }>;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('DNS_FAILED');
  }
  if (!records.length) throw new Error('DNS_FAILED');
  for (const r of records) {
    if (isBlockedIp(r.address)) {
      throw new Error('BLOCKED_ADDRESS');
    }
  }
  return records[0].address;
}

/** True when the TCP peer is loopback (local browser / Electron). */
export function isLoopbackRemoteAddress(remote?: string | null): boolean {
  if (!remote) return false;
  const ip = remote.startsWith('::ffff:') ? remote.slice(7) : remote;
  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (net.isIP(ip) === 4) {
    const n = ipv4ToInt(ip);
    return n !== null && (n & 0xff000000) === 0x7f000000;
  }
  return false;
}

/**
 * Require application/json and same-origin (or missing Origin for same-origin fetch).
 * Returns null when allowed, otherwise a uniform error string.
 */
export function validateFetchImageRequestHeaders(headers: {
  get(name: string): string | null;
}): string | null {
  const ct = (headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json')) {
    return UNIFORM_IMAGE_FETCH_ERROR;
  }
  const origin = headers.get('origin');
  const host = headers.get('host');
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return UNIFORM_IMAGE_FETCH_ERROR;
      }
    } catch {
      return UNIFORM_IMAGE_FETCH_ERROR;
    }
  }
  const site = (headers.get('sec-fetch-site') || '').toLowerCase();
  if (site && site !== 'same-origin' && site !== 'none' && site !== 'same-site') {
    return UNIFORM_IMAGE_FETCH_ERROR;
  }
  return null;
}
