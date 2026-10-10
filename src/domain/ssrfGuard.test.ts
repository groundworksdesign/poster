import {
  isBlockedIp,
  isBlockedIpv4,
  isLoopbackRemoteAddress,
  resolvePublicAddress,
  validateFetchImageRequestHeaders,
  UNIFORM_IMAGE_FETCH_ERROR,
} from './ssrfGuard';

describe('ssrfGuard', () => {
  it('blocks loopback, private, link-local and metadata IPv4', () => {
    expect(isBlockedIpv4('127.0.0.1')).toBe(true);
    expect(isBlockedIpv4('10.0.0.5')).toBe(true);
    expect(isBlockedIpv4('172.16.1.1')).toBe(true);
    expect(isBlockedIpv4('172.31.255.255')).toBe(true);
    expect(isBlockedIpv4('192.168.1.1')).toBe(true);
    expect(isBlockedIpv4('169.254.169.254')).toBe(true);
    expect(isBlockedIpv4('0.0.0.0')).toBe(true);
    expect(isBlockedIpv4('8.8.8.8')).toBe(false);
    expect(isBlockedIpv4('172.15.0.1')).toBe(false);
    expect(isBlockedIpv4('172.32.0.1')).toBe(false);
  });

  it('blocks IPv6 loopback, ULA and link-local', () => {
    expect(isBlockedIp('::1')).toBe(true);
    expect(isBlockedIp('fc00::1')).toBe(true);
    expect(isBlockedIp('fd12::1')).toBe(true);
    expect(isBlockedIp('fe80::1')).toBe(true);
    expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedIp('::ffff:8.8.8.8')).toBe(false);
  });

  it('resolvePublicAddress rejects literal private IPs', async () => {
    await expect(resolvePublicAddress('127.0.0.1')).rejects.toThrow('BLOCKED_ADDRESS');
    await expect(resolvePublicAddress('169.254.169.254')).rejects.toThrow('BLOCKED_ADDRESS');
    await expect(resolvePublicAddress('10.1.2.3')).rejects.toThrow('BLOCKED_ADDRESS');
  });

  it('isLoopbackRemoteAddress accepts local peers', () => {
    expect(isLoopbackRemoteAddress('127.0.0.1')).toBe(true);
    expect(isLoopbackRemoteAddress('::1')).toBe(true);
    expect(isLoopbackRemoteAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackRemoteAddress('192.168.1.5')).toBe(false);
  });

  it('validateFetchImageRequestHeaders requires JSON and same-origin', () => {
    const headers = (map: Record<string, string>) => ({
      get: (name: string) => map[name.toLowerCase()] ?? null,
    });
    expect(
      validateFetchImageRequestHeaders(
        headers({ 'content-type': 'text/plain', host: '127.0.0.1:3000' })
      )
    ).toBe(UNIFORM_IMAGE_FETCH_ERROR);
    expect(
      validateFetchImageRequestHeaders(
        headers({
          'content-type': 'application/json',
          host: '127.0.0.1:3000',
          origin: 'http://evil.example',
        })
      )
    ).toBe(UNIFORM_IMAGE_FETCH_ERROR);
    expect(
      validateFetchImageRequestHeaders(
        headers({
          'content-type': 'application/json',
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3000',
        })
      )
    ).toBeNull();
  });
});
