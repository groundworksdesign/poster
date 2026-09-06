import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import {
  applyTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  useTheme,
} from './useTheme';

function ThemeProbe() {
  const [theme] = useTheme();
  return <div data-testid="theme-probe">{theme}</div>;
}

describe('useTheme persist + sync', () => {
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

  it('prefers the durable app theme bridge when available', () => {
    const setTheme = jest.fn();
    Object.defineProperty(window, 'poster', {
      configurable: true,
      value: {
        readThemeSync: () => 'dracula',
        setTheme,
      },
    });

    expect(readStoredTheme()).toBe('dracula');
    applyTheme('tokyo-night');
    expect(setTheme).toHaveBeenCalledWith('tokyo-night');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('tokyo-night');

    delete (window as typeof window & { poster?: unknown }).poster;
  });

  it('restores stored theme after remount (app restart / Home reopen)', async () => {
    applyTheme('github-dark');
    const first = render(<ThemeProbe />);
    await waitFor(() => expect(screen.getByTestId('theme-probe')).toHaveTextContent('github-dark'));
    expect(document.documentElement.dataset.theme).toBe('github-dark');
    first.unmount();

    delete document.documentElement.dataset.theme;
    render(<ThemeProbe />);
    await waitFor(() => expect(screen.getByTestId('theme-probe')).toHaveTextContent('github-dark'));
    expect(document.documentElement.dataset.theme).toBe('github-dark');
  });

  it('syncs when another window writes poster-theme (storage event)', async () => {
    render(<ThemeProbe />);
    await waitFor(() => expect(screen.getByTestId('theme-probe')).toHaveTextContent('light'));

    act(() => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dracula');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: THEME_STORAGE_KEY,
          newValue: 'dracula',
          storageArea: localStorage,
        }),
      );
    });

    await waitFor(() => expect(screen.getByTestId('theme-probe')).toHaveTextContent('dracula'));
    expect(document.documentElement.dataset.theme).toBe('dracula');
  });

  it('re-reads storage when tab becomes visible (Home reopen path)', async () => {
    render(<ThemeProbe />);
    await waitFor(() => expect(screen.getByTestId('theme-probe')).toHaveTextContent('light'));
    act(() => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark-blue');
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(screen.getByTestId('theme-probe')).toHaveTextContent('dark-blue'));
    expect(document.documentElement.dataset.theme).toBe('dark-blue');
  });
});
