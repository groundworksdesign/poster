import React, { useState, useEffect } from 'react';
import LibraryPanel from './Deck/LibraryPanel';
import { THEMES, useTheme, type ThemeId } from './useTheme';
import { subscribeLibraryChanged } from './libraryRefresh';
import { remixDataUrl, REMIX_ROUTE_ID } from './remixDataUrl';

const POPUP_FEATURES =
  'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes';

/**
 * Opens a Poster route in a dedicated window/tab without navigating Home away.
 */
function openAppWindow(e: React.MouseEvent<HTMLAnchorElement>, windowName: string) {
  e.preventDefault();
  const url = e.currentTarget.href;
  const w = window.open(url, windowName, POPUP_FEATURES);
  if (w) {
    w.opener = null;
    w.focus();
  } else {
    window.location.assign(url);
  }
}

/**
 * Open a deck builder window/tab while keeping Home put (Open Presentation).
 * Falls back to same-tab navigation if the browser blocks the popup.
 */
function openDeckWindow(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  const url = e.currentTarget.href;
  const w = window.open(url, '_blank', POPUP_FEATURES);
  if (w) {
    w.opener = null;
    w.focus();
  } else {
    window.location.assign(url);
  }
}

export default function HomePage() {
  const [theme, setTheme] = useTheme();
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [libraryRoot, setLibraryRoot] = useState<string | null>(null);

  useEffect(() => {
    return subscribeLibraryChanged(() => setLibraryRefreshKey((k) => k + 1));
  }, []);

  useEffect(() => {
    fetch(remixDataUrl('/library/settings', REMIX_ROUTE_ID.librarySettings))
      .then((response) => response.json() as Promise<{ libraryRoot?: string }>)
      .then((data) => setLibraryRoot(data.libraryRoot ?? null))
      .catch(() => setLibraryRoot(null));
  }, []);

  const changeLibraryRoot = async () => {
    let next: string | null = null;
    const bridge = (window as typeof window & { poster?: unknown }).poster;
    const picker = bridge as { pickLibraryFolder?: () => Promise<string | null> } | undefined;
    if (picker && typeof picker.pickLibraryFolder === 'function') {
      try {
        next = await picker.pickLibraryFolder();
      } catch {
        next = null;
      }
    } else {
      next = window.prompt('Library folder', libraryRoot ?? '');
    }
    if (!next || next === libraryRoot) return;
    const response = await fetch(remixDataUrl('/library/settings', REMIX_ROUTE_ID.librarySettings), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ libraryRoot: next }),
    });
    const data = await response.json() as { libraryRoot?: string; error?: string };
    if (!response.ok || !data.libraryRoot) {
      window.alert(data.error ?? 'Unable to change library folder.');
      return;
    }
    setLibraryRoot(data.libraryRoot);
    setLibraryRefreshKey((k) => k + 1);
  };

  const handleOpenFromLibrary = (id: string) => {
    // Same window.open shape as blank-deck Open Presentation (POPUP_FEATURES, no noopener).
    // noopener makes Electron skip did-create-window, so the Library Deck never gets
    // attachWindowOpenPolicy — Open Present then misses main-owned present-session and
    // can stick on SSR Loading (Jack tip 497d454 / REQ-008).
    const url = `${window.location.origin}/deck?open=${encodeURIComponent(id)}`;
    const tab = window.open(url, '_blank', POPUP_FEATURES);
    if (tab) {
      tab.opener = null;
      tab.focus();
    } else {
      window.location.assign(url);
    }
  };

  return (
    <main className="home-page">
      <h1>Poster</h1>

      <div className="home-page-theme-picker">
        <label>
          Theme:{' '}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeId)}
            aria-label="Select theme"
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="home-page-library-settings">
        <span>Library folder: {libraryRoot ?? 'Loading...'}</span>{' '}
        <button type="button" onClick={changeLibraryRoot}>Change...</button>
      </div>

      <p className="home-page-lead">
        <strong>Home</strong> is your library of saved presentations. Open a presentation to work
        in the deck builder; from the deck, use <strong>Open Present</strong> for the projector
        window where slides play.
      </p>
      <ol className="home-page-steps">
        <li>Open a presentation (deck builder) from Home — this page stays open.</li>
        <li>
          In the deck, choose a slide and click Open Present for a session-scoped Present window.
        </li>
        <li>Send slides to Present from the deck; use arrow keys or on-screen controls as needed.</li>
      </ol>
      <div className="home-page-actions">
        <a
          className="home-page-link home-page-link--present"
          href="/deck"
          data-testid="open-presentation"
          onClick={openDeckWindow}
        >
          Open Presentation
        </a>
        <a
          className="home-page-link home-page-link--deck"
          href="/deck"
          onClick={(e) => openAppWindow(e, 'posterDeck')}
        >
          Open deck builder (new window)
        </a>
        <a
          className="home-page-link home-page-link--import"
          href="/deck?focusImport=1"
          data-testid="import-file"
          onClick={openDeckWindow}
        >
          Import a file
        </a>
      </div>

      <div className="home-page-library">
        <LibraryPanel
          onOpen={handleOpenFromLibrary}
          onDeleted={() => setLibraryRefreshKey((k) => k + 1)}
          currentLibraryId={null}
          refreshKey={libraryRefreshKey}
        />
      </div>
    </main>
  );
}
