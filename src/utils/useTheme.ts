import { useEffect, useState } from 'react';

export const THEME_STORAGE_KEY = 'poster-theme';

export const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'tokyo-night', label: 'Tokyo Night' },
  { id: 'dark-blue', label: 'Dark Blue' },
  { id: 'github-dark', label: 'GitHub Dark' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEMES.some((t) => t.id === stored)) {
      return stored as ThemeId;
    }
  } catch {
    // ignore
  }
  return 'light';
}

export function applyTheme(theme: ThemeId): void {
  if (theme === 'light') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function useTheme(): [ThemeId, (theme: ThemeId) => void] {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next: ThemeId) => {
    applyTheme(next);
    setThemeState(next);
  };

  return [theme, setTheme];
}
