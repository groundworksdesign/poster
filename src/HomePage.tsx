import React, { useState } from 'react';
import LibraryPanel from './Deck/LibraryPanel';
import { THEMES, useTheme, type ThemeId } from './utils/useTheme';

/**
 * Opens the presentation in a dedicated window (second screen / projector).
 * Falls back to same-tab navigation if the browser blocks the popup.
 */
function openPresentationWindow(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  const url = e.currentTarget.href;
  const features =
    'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes';
  const w = window.open(url, 'posterPresentation', features);
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
        Poster is a two-part app: you run the <strong>deck builder</strong> to load or edit slides
        and send them to the <strong>presentation</strong> view. Both tabs talk to each other in
        the same browser (no server required for the live feed).
      </p>
      <ol className="home-page-steps">
        <li>
          Open the deck builder. Load a slide deck (JSON), import a song (XML), or open something
          from the library when using the full app.
        </li>
        <li>
          Open the presentation on your projector or second monitor—keep it on top and fullscreen
          there.
        </li>
        <li>
          In the builder, choose a slide and send it to the presentation. Use arrow keys or
          on-screen controls to move through the deck or through song lyrics.
        </li>
      </ol>
      <div className="home-page-actions">
        <a
          className="home-page-link home-page-link--deck"
          href="/deck"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open deck builder (new tab)
        </a>
        <a
          className="home-page-link home-page-link--present"
          href="/presentation"
          onClick={openPresentationWindow}
        >
          Open presentation (new window)
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
          onDeleted={() => setLibraryRefreshKey(k => k + 1)}
          currentLibraryId={null}
          refreshKey={libraryRefreshKey}
        />
      </div>
    </main>
  );
}
