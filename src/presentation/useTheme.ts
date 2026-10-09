import { useEffect, useRef, useState } from 'react';

export const THEME_STORAGE_KEY = 'poster-theme';

export const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'tokyo-night', label: 'Tokyo Night' },
  { id: 'dark-blue', label: 'Dark Blue' },
  { id: 'github-dark', label: 'GitHub Dark' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

function getThemeBridge(): { readThemeSync?: () => unknown; readTheme?: () => unknown; setTheme?: (theme: ThemeId) => unknown } | undefined {
  if (typeof window === 'undefined') return undefined;
  const bridge = (window as typeof window & { poster?: unknown }).poster;
  if (!bridge || typeof bridge !== 'object') return undefined;
  return bridge as { readThemeSync?: () => unknown; readTheme?: () => unknown; setTheme?: (theme: ThemeId) => unknown };
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some((t) => t.id === value);
}

export function readStoredTheme(): ThemeId {
  try {
    const bridge = getThemeBridge();
    const bridgeTheme = bridge?.readThemeSync?.();
    if (isThemeId(bridgeTheme)) {
      return bridgeTheme;
    }
  } catch {
    // ignore bridge issues; fall through to browser storage
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }

  return 'light';
}

/** Apply theme to this document and persist for app restart / Home reopen. */
export function applyTheme(theme: ThemeId): void {
  if (theme === 'light') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }

  try {
    const bridge = getThemeBridge();
    if (bridge?.setTheme) {
      bridge.setTheme(theme);
    }
  } catch {
    // ignore bridge failures; browser storage remains fallback
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

/**
 * Theme for Home, deck builders, and Present windows.
 * SSR-safe: starts as light, then hydrates from localStorage on the client
 * so app restart and Home close/reopen restore the dropdown and data-theme.
 * Listens for cross-window storage updates.
 */
export function useTheme(): [ThemeId, (theme: ThemeId) => void] {
  const [theme, setThemeState] = useState<ThemeId>('light');
  const [hydrated, setHydrated] = useState(false);
  /** True once the user (or a test) explicitly chose a theme this mount. */
  const userSetRef = useRef(false);

  useEffect(() => {
    // Mark ready for e2e; do not clobber a theme the user already set before this effect.
    if (!userSetRef.current) {
      const stored = readStoredTheme();
      setThemeState(stored);
      applyTheme(stored);
    }
    setHydrated(true);
    try {
      document.documentElement.dataset.themeReady = '1';
    } catch {
      // ignore
    }
    return () => {
      try {
        delete document.documentElement.dataset.themeReady;
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyTheme(theme);
  }, [theme, hydrated]);

  useEffect(() => {
    const syncFromStorage = () => {
      const stored = readStoredTheme();
      setThemeState((current) => (current === stored ? current : stored));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
      syncFromStorage();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const setTheme = (next: ThemeId) => {
    userSetRef.current = true;
    applyTheme(next);
    setThemeState(next);
  };

  return [theme, setTheme];
}
