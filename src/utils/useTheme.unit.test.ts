import { applyTheme, readStoredTheme, THEME_STORAGE_KEY } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('applyTheme sets data-theme for dark palettes', () => {
    applyTheme('dracula');
    expect(document.documentElement.dataset.theme).toBe('dracula');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dracula');
  });

  it('applyTheme clears data-theme for light', () => {
    document.documentElement.dataset.theme = 'dracula';
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('readStoredTheme falls back to light', () => {
    expect(readStoredTheme()).toBe('light');
    localStorage.setItem(THEME_STORAGE_KEY, 'tokyo-night');
    expect(readStoredTheme()).toBe('tokyo-night');
  });
});
