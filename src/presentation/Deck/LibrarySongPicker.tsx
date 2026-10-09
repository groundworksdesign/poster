import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { LibrarySong } from '../../domain/librarySong';
import {
  filterSongsByBook,
  firstVerseText,
  shouldShowFirstVerse,
  uniqueBooks,
} from '../../domain/librarySongPicker';
import { remixDataUrl, REMIX_ROUTE_ID } from '../remixDataUrl';
import type { SongSlideChoice } from './AddSongSlideChooser';
import { markSearchEscConsumed } from './songPanelEsc';

type Props = {
  onPick: (choice: SongSlideChoice) => void;
  onSwitchToImport?: () => void;
  /** Empty-library / no-match: stay in panel and open scratch editor. */
  onTypeNewSong?: () => void;
};

/**
 * Searchable library picker for adding a linked song slide.
 * Search matches title, book, number, and lyrics. Shared titles show first verse inline.
 * Enter or double-click inserts the focused/chosen song (linked via librarySongId).
 */
export default function LibrarySongPicker({ onPick, onSwitchToImport, onTypeNewSong }: Props) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [allForBooks, setAllForBooks] = useState<LibrarySong[]>([]);
  const [results, setResults] = useState<LibrarySong[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(t);
  }, [query]);

  const fetchSongs = useCallback(async (q: string) => {
    setError(null);
    try {
      const base = remixDataUrl('/library/songs', REMIX_ROUTE_ID.librarySongs);
      const sep = base.includes('?') ? '&' : '?';
      const url = q.trim() ? `${base}${sep}q=${encodeURIComponent(q.trim())}` : base;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to search library (${res.status})`);
      const data = (await res.json()) as LibrarySong[];
      setResults(data);
      if (!q.trim()) setAllForBooks(data);
      setFocusIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    }
  }, []);

  useEffect(() => {
    void fetchSongs(debouncedQuery);
  }, [debouncedQuery, fetchSongs]);

  const books = useMemo(() => uniqueBooks(allForBooks.length ? allForBooks : results ?? []), [
    allForBooks,
    results,
  ]);

  const visible = useMemo(
    () => filterSongsByBook(results ?? [], bookFilter),
    [results, bookFilter],
  );

  const pick = (song: LibrarySong) => {
    onPick({
      lyrics: {
        title: song.lyrics.title || song.title,
        author: song.lyrics.author ?? song.author ?? undefined,
        verses: song.lyrics.verses,
      },
      librarySongId: song.id,
      book: song.book,
      number: song.number,
    });
  };

  const importBtnRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // State B: focus "Import a song file" when the library is empty.
    if (results !== null && results.length === 0 && !debouncedQuery.trim() && !bookFilter) {
      importBtnRef.current?.focus();
    }
  }, [results, debouncedQuery, bookFilter]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Spec Esc step 1: clear search text before backing out to type choice.
      // Do NOT stopPropagation — React 18 stops the native event too, so the
      // window Esc handler never consumes the flag and the next Esc is swallowed.
      if (query.trim() || bookFilter) {
        e.preventDefault();
        markSearchEscConsumed();
        setQuery('');
        setBookFilter('');
        setFocusIndex(0);
      }
      return;
    }
    if (!visible.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex(i => Math.min(i + 1, visible.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      // Enter and Ctrl/Cmd+Enter both stop on the song card (pick only) — never save (Roy).
      e.preventDefault();
      e.stopPropagation();
      const song = visible[focusIndex];
      if (song) pick(song);
    }
  };

  const emptyLibrary = results !== null && results.length === 0 && !debouncedQuery.trim() && !bookFilter;

  return (
    <div className="library-song-picker" data-testid="library-song-picker" onKeyDown={onKeyDown}>
      <label className="library-song-picker-search">
        Search
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Title, book, number, or lyrics"
          data-testid="library-song-search"
          autoFocus
        />
      </label>

      {books.length > 0 ? (
        <label className="library-song-picker-book">
          Book
          <select
            value={bookFilter}
            onChange={e => {
              setBookFilter(e.target.value);
              setFocusIndex(0);
            }}
            data-testid="library-song-book-filter"
          >
            <option value="">All books</option>
            {books.map(b => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {error ? (
        <p className="add-song-chooser-error" role="alert">
          {error}
        </p>
      ) : null}

      {results === null ? <p>Loading...</p> : null}

      {emptyLibrary ? (
        <div data-testid="add-song-library-empty">
          <p>Your song library is empty.</p>
          <p style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {onSwitchToImport ? (
              <button
                ref={importBtnRef}
                type="button"
                onClick={onSwitchToImport}
                data-testid="add-song-go-import"
              >
                Import a song file
              </button>
            ) : null}
            {onTypeNewSong ? (
              <button type="button" onClick={onTypeNewSong} data-testid="add-song-go-hand">
                Type a new song
              </button>
            ) : (
              <a href="/library/songs/add" data-testid="add-song-go-hand">
                Type a new song
              </a>
            )}
            <a
              href="/library/songs"
              data-testid="add-song-open-library"
              onClick={e => {
                e.preventDefault();
                window.open('/library/songs', 'posterSongLibrary', 'width=1280,height=720');
              }}
            >
              Open song library ↗
            </a>
          </p>
        </div>
      ) : null}

      {results && !emptyLibrary ? (
        <ul className="library-song-picker-list" data-testid="library-song-pick-list" role="listbox">
          {visible.length === 0 ? (
            <li data-testid="library-song-no-matches">No songs match.</li>
          ) : (
            visible.map((song, index) => {
              const showVerse = shouldShowFirstVerse(song, visible);
              const verse = showVerse ? firstVerseText(song) : null;
              return (
                <li
                  key={song.id}
                  role="option"
                  aria-selected={index === focusIndex}
                  className={
                    index === focusIndex
                      ? 'library-song-picker-row library-song-picker-row--focus'
                      : 'library-song-picker-row'
                  }
                  data-testid={`library-song-row-${song.id}`}
                  data-focused={index === focusIndex ? 'true' : 'false'}
                  onMouseEnter={() => setFocusIndex(index)}
                  onDoubleClick={() => pick(song)}
                >
                  <button
                    type="button"
                    className="library-song-picker-pick"
                    onClick={() => pick(song)}
                    data-testid={`add-song-pick-${song.id}`}
                  >
                    <span className="library-song-picker-title">
                      <strong>{song.title}</strong>
                      {song.book || song.number
                        ? ` — ${[song.book, song.number].filter(Boolean).join(' ')}`
                        : ''}
                    </span>
                    {verse ? (
                      <span
                        className="library-song-picker-verse"
                        data-testid={`library-song-verse-${song.id}`}
                        style={{ display: 'block', whiteSpace: 'pre-wrap', color: '#666' }}
                      >
                        {verse}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}

      {visible.length > 0 ? (
        <p className="library-song-picker-hint">
          Enter, Ctrl/Cmd+Enter, or double-click to choose the song (then Save slide).
        </p>
      ) : null}
    </div>
  );
}
