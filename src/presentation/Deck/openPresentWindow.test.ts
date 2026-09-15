import {
  hasPosterBridge,
  navigatePresentAfterSpawn,
  openPresentForRuntime,
  planPresentOpen,
  toAbsolutePresentUrl,
  waitForPosterBridge,
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

  test('planPresentOpen uses electron-direct when window.poster exists', () => {
    expect(hasPosterBridge({ poster: {} })).toBe(true);
    expect(planPresentOpen({ poster: {} })).toEqual({ mode: 'electron-direct' });
    expect(planPresentOpen({})).toEqual({ mode: 'browser-gesture-blank' });
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
    expect(open.mock.calls[0][0]).not.toMatch(/^\/presentation/);
  });

  test('openPresentForRuntime Electron path never opens about:blank (AppImage cold-open fix)', async () => {
    const open = jest.fn().mockReturnValue({ closed: false });
    const spawnPresent = jest.fn().mockResolvedValue({
      url: '/presentation?sessionId=s1&presentId=p1',
      presentId: 'p1',
    });

    const result = await openPresentForRuntime({
      spawnPresent,
      origin: 'http://127.0.0.1:3000',
      open: open as unknown as typeof window.open,
      bridgeWindow: { poster: { deckCommand: jest.fn() } },
    });

    expect(result.mode).toBe('electron-direct');
    expect(result.presentId).toBe('p1');
    expect(result.absoluteUrl).toBe(
      'http://127.0.0.1:3000/presentation?sessionId=s1&presentId=p1',
    );
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/presentation?sessionId=s1&presentId=p1',
      '_blank',
      expect.any(String),
    );
    // Old packaged path opened about:blank first — that shell never hydrates.
    expect(open.mock.calls.some((call) => call[0] === 'about:blank')).toBe(false);
  });

  test('openPresentForRuntime browser path keeps about:blank gesture then absolute navigate', async () => {
    const location = { href: 'about:blank' };
    const blank = {
      closed: false,
      opener: {} as Window | null,
      focus: jest.fn(),
      close: jest.fn(),
      location,
    };
    const open = jest.fn().mockReturnValue(blank);
    const spawnPresent = jest.fn().mockResolvedValue({
      url: '/presentation?sessionId=s1&presentId=p1',
      presentId: 'p1',
    });

    const result = await openPresentForRuntime({
      spawnPresent,
      origin: 'http://127.0.0.1:3000',
      open: open as unknown as typeof window.open,
      bridgeWindow: {},
    });

    expect(result.mode).toBe('browser-gesture-blank');
    expect(open).toHaveBeenCalledWith('about:blank', '_blank', expect.any(String));
    expect(location.href).toBe(
      'http://127.0.0.1:3000/presentation?sessionId=s1&presentId=p1',
    );
  });

  test('waitForPosterBridge resolves true when poster appears before timeout', async () => {
    const win: { poster?: unknown } = {};
    let now = 0;
    const sleeps: number[] = [];
    const pending = waitForPosterBridge(win, {
      timeoutMs: 500,
      intervalMs: 50,
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
        if (sleeps.length === 2) win.poster = {};
      },
    });
    await expect(pending).resolves.toBe(true);
    expect(hasPosterBridge(win)).toBe(true);
  });

  test('waitForPosterBridge returns false when poster never appears', async () => {
    let now = 0;
    await expect(
      waitForPosterBridge(
        {},
        {
          timeoutMs: 100,
          intervalMs: 40,
          now: () => now,
          sleep: async (ms) => {
            now += ms;
          },
        },
      ),
    ).resolves.toBe(false);
  });

  test('openPresentForRuntime waits for late poster before electron-direct (AppImage import race)', async () => {
    const open = jest.fn().mockReturnValue({ closed: false });
    const spawnPresent = jest.fn().mockResolvedValue({
      url: '/presentation?sessionId=s1&presentId=p1',
      presentId: 'p1',
    });
    const bridgeWindow: { poster?: unknown } = {};
    // Expose poster after openPresentForRuntime begins waiting.
    setTimeout(() => {
      bridgeWindow.poster = { deckCommand: jest.fn() };
    }, 30);

    const result = await openPresentForRuntime({
      spawnPresent,
      origin: 'http://127.0.0.1:3000',
      open: open as unknown as typeof window.open,
      bridgeWindow,
      bridgeWaitMs: 500,
    });

    expect(result.mode).toBe('electron-direct');
    expect(open.mock.calls.some((call) => call[0] === 'about:blank')).toBe(false);
    expect(open).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/presentation?sessionId=s1&presentId=p1',
      '_blank',
      expect.any(String),
    );
  });
});
