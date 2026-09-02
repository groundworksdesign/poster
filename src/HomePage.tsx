import React, { useState } from 'react';
import LibraryPanel from './Deck/LibraryPanel';
import { THEMES, useTheme, type ThemeId } from './utils/useTheme';

const POPUP_FEATURES =
  'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes';

/**
 * Open a deck builder window/tab while keeping Home put.
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

  const handleOpenFromLibrary = (id: string) => {
    const url = '/deck?open=' + encodeURIComponent(id);
    const tab = window.open(url, '_blank', 'noopener,noreferrer');
    if (tab) {
      tab.opener = null;
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

      <p className="home-page-lead">
        <strong>Home</strong> is your library of saved presentations. Open a presentation to work
        in the deck builder; from the deck, use <strong>Open Present</strong> for the projector
        window where slides play.
      </p>
      <ol className="home-page-steps">
        <li>Open a presentation (deck builder) from Home — this page stays open.</li>
        <li>In the deck, choose a slide and click Open Present for a session-scoped Present window.</li>
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
          target="_blank"
          rel="noopener noreferrer"
        >
          Open deck builder (new tab)
        </a>
        <a
          className="home-page-link home-page-link--import"
          href="/deck?focusImport=1"
          target="_blank"
          rel="noopener noreferrer"
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
