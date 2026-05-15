import React, { useEffect, useState } from 'react';
import './App.css';

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

const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'tokyo-night', label: 'Tokyo Night' },
  { id: 'dark-blue', label: 'Dark Blue' },
  { id: 'github-dark', label: 'GitHub Dark' },
];

export default function HomePage() {
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('poster-theme') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      if (theme) {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('poster-theme', theme);
      }
    } catch (e) {
      // ignore
    }
  }, [theme]);

  return (
    <main className="home-page">
      <h1>Poster</h1>

      <div className="home-page-theme-picker" style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 14 }}>
          Theme:{' '}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
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
      </div>
    </main>
  );
}
