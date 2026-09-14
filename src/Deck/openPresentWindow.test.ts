import {
  navigatePresentAfterSpawn,
  toAbsolutePresentUrl,
} from './openPresentWindow';

describe('openPresentWindow', () => {
  test('toAbsolutePresentUrl resolves relative Present URLs against the deck origin', () => {
    expect(
      toAbsolutePresentUrl(
        '/presentation?sessionId=s1&presentId=p1',
        'http://127.0.0.1:4173',
      ),
    ).toBe('http://127.0.0.1:4173/presentation?sessionId=s1&presentId=p1');
  });

  test('navigatePresentAfterSpawn never assigns a relative href onto about:blank', () => {
    const location = { href: 'about:blank' };
    const blank = {
      closed: false,
      opener: {} as Window | null,
      focus: jest.fn(),
      location,
    } as unknown as Window;

    const open = jest.fn();
    const result = navigatePresentAfterSpawn(
      blank,
      '/presentation?sessionId=s1&presentId=p1',
      'http://127.0.0.1:3000',
      open as unknown as typeof window.open,
    );

    expect(result).toBe(blank);
    expect(location.href).toBe(
      'http://127.0.0.1:3000/presentation?sessionId=s1&presentId=p1',
    );
    expect(location.href.startsWith('/')).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  test('navigatePresentAfterSpawn falls back to absolute window.open when blank is denied', () => {
    const open = jest.fn().mockReturnValue({ closed: false });
    navigatePresentAfterSpawn(
      null,
      '/presentation?sessionId=s1&presentId=p1',
      'http://127.0.0.1:3000',
      open as unknown as typeof window.open,
    );

    expect(open).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/presentation?sessionId=s1&presentId=p1',
      '_blank',
      expect.any(String),
    );
    // Old boot path opened the relative spawn URL — that fails to hydrate after
    // a denied about:blank shell in packaged Electron/AppImage.
    expect(open.mock.calls[0][0]).not.toMatch(/^\/presentation/);
  });
});
