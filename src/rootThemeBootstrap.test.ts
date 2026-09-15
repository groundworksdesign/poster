import { themeInitScript } from './adapters/remix/root';

describe('theme bootstrap script', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete (window as Window & { poster?: unknown }).poster;
  });

  it('ignores invalid persisted values before React hydrates', () => {
    localStorage.setItem('poster-theme', 'not-a-theme');
    document.documentElement.dataset.theme = 'dracula';

    new Function(themeInitScript)();

    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('applies a valid durable bridge value before paint', () => {
    Object.defineProperty(window, 'poster', {
      configurable: true,
      value: { readThemeSync: () => 'tokyo-night' },
    });

    new Function(themeInitScript)();

    expect(document.documentElement.dataset.theme).toBe('tokyo-night');
  });
});
