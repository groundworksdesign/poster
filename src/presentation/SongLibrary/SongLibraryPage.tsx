import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { LibrarySong } from '../../domain/librarySong';
import { parseVersesText, versesToText } from '../../domain/librarySong';
import {
  filterSongsByBook,
  firstVerseLine,
  shouldShowFirstVerse,
  uniqueBooks,
} from '../../domain/librarySongPicker';
import { remixDataUrl, REMIX_ROUTE_ID } from '../remixDataUrl';

export type LibrarySongRow = LibrarySong & { usedInDeckCount?: number };

/**
 * Manage song library: search (same as picker), Add / Edit / Delete / Import,
 * and used-in-N-decks count (Pam). Edit/delete update the library only;
 * linked deck-update confirms are deferred to linked-update-decks.
 */
export default function SongLibraryPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [allForBooks, setAllForBooks] = useState<LibrarySongRow[]>([]);
  const [results, setResults] = useState<LibrarySongRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<LibrarySongRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBook, setEditBook] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editVerses, setEditVerses] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(t);
  }, [query]);

  const fetchSongs = useCallback(async (q: string) => {
    setError(null);
    try {
      const base = remixDataUrl('/library/songs', REMIX_ROUTE_ID.librarySongs);
      const sep = base.includes('?') ? '&' : '?';
      const params = new URLSearchParams({ usage: '1' });
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`${base}${sep}${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load library (${res.status})`);
      const data = (await res.json()) as LibrarySongRow[];
      setResults(data);
      if (!q.trim()) setAllForBooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
      setResults([]);
    }
  }, []);

  useEffect(() => {
    void fetchSongs(debouncedQuery);
  }, [debouncedQuery, fetchSongs]);

  const books = useMemo(
    () => uniqueBooks(allForBooks.length ? allForBooks : results ?? []),
    [allForBooks, results],
  );

  const visible = useMemo(
    () => filterSongsByBook(results ?? [], bookFilter),
    [results, bookFilter],
  );

  const startEdit = (song: LibrarySongRow) => {
    setStatus(null);
    setError(null);
    setEditing(song);
    setEditTitle(song.title);
    setEditBook(song.book ?? '');
    setEditNumber(song.number ?? '');
    setEditVerses(versesToText(song.lyrics?.verses));
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setError('Title is required.');
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const verses = parseVersesText(editVerses);
      const res = await fetch(remixDataUrl('/library/songs/save', REMIX_ROUTE_ID.librarySongsSave), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          title: trimmed,
          book: editBook.trim() || null,
          number: editNumber.trim() || null,
          lyrics: { title: trimmed, verses },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      // Seam: linked-update-decks will prompt about decks using this song after edit.
      setStatus(`Updated "${trimmed}" in the library.`);
      setEditing(null);
      await fetchSongs(debouncedQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error saving song.');
    } finally {
      setBusy(false);
    }
  };

  const deleteSong = async (song: LibrarySongRow) => {
    const used = song.usedInDeckCount ?? 0;
    const confirmMsg =
      used > 0
        ? `Delete "${song.title}" from the library? It is used in ${used} deck${used === 1 ? '' : 's'}. Decks are not updated yet (confirm flow comes later).`
        : `Delete "${song.title}" from the library?`;
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(
        remixDataUrl(`/library/songs/delete/${song.id}`, REMIX_ROUTE_ID.librarySongsDelete),
        { method: 'POST' },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || `Delete failed (${res.status})`);
        return;
      }
      // Seam: linked-update-decks will offer to update/remove linked slides after delete.
      setStatus(`Deleted "${song.title}" from the library.`);
      if (editing?.id === song.id) setEditing(null);
      await fetchSongs(debouncedQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error deleting song.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="song-library-page" data-testid="song-library-page">
      <h1>Song library</h1>
      <p className="song-library-page-lead">
        Search your local songs. Add, edit, delete, or import. Each row shows how many saved decks
        use the song.
      </p>

      <div className="song-library-actions" data-testid="song-library-actions">
        <a href="/library/songs/add" data-testid="song-library-add">
          Add song
        </a>
        <a href="/library/songs/import" data-testid="song-library-import">
          Import
        </a>
        <a href="/" data-testid="song-library-home">
          Home
        </a>
      </div>

      <label className="library-song-picker-search">
        Search
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Title, book, number, or lyrics"
          data-testid="song-library-search"
        />
      </label>

      {books.length > 0 ? (
        <label className="library-song-picker-book">
          Book
          <select
            value={bookFilter}
            onChange={e => setBookFilter(e.target.value)}
            data-testid="song-library-book-filter"
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
        <p className="add-song-error" role="alert" data-testid="song-library-error">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="add-song-status" data-testid="song-library-status">
          {status}
        </p>
      ) : null}

      {editing ? (
        <form
          className="add-song-form song-library-edit-form"
          onSubmit={saveEdit}
          data-testid="song-library-edit-form"
        >
          <h2>Edit song</h2>
          <label>
            Title
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              required
              data-testid="song-library-edit-title"
            />
          </label>
          <label>
            Book
            <input
              type="text"
              value={editBook}
              onChange={e => setEditBook(e.target.value)}
              data-testid="song-library-edit-book"
            />
          </label>
          <label>
            Number
            <input
              type="text"
              value={editNumber}
              onChange={e => setEditNumber(e.target.value)}
              data-testid="song-library-edit-number"
            />
          </label>
          <label>
            Verses
            <textarea
              value={editVerses}
              onChange={e => setEditVerses(e.target.value)}
              rows={8}
              data-testid="song-library-edit-verses"
            />
          </label>
          <div className="song-library-edit-buttons">
            <button type="submit" disabled={busy} data-testid="song-library-edit-save">
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={cancelEdit} disabled={busy} data-testid="song-library-edit-cancel">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {results === null ? <p>Loading...</p> : null}

      {results && results.length === 0 && !debouncedQuery.trim() && !bookFilter ? (
        <p data-testid="song-library-empty">Your song library is empty.</p>
      ) : null}

      {results && !(results.length === 0 && !debouncedQuery.trim() && !bookFilter) ? (
        <ul className="song-library-list" data-testid="song-library-list">
          {visible.length === 0 ? (
            <li data-testid="song-library-no-matches">No songs match.</li>
          ) : (
            visible.map(song => {
              const showVerse = shouldShowFirstVerse(song, visible);
              const verse = showVerse ? firstVerseLine(song) : null;
              const used = song.usedInDeckCount ?? 0;
              return (
                <li
                  key={song.id}
                  className="song-library-row"
                  data-testid={`song-library-row-${song.id}`}
                >
                  <div className="song-library-row-main">
                    <span className="song-library-row-title">
                      <strong>{song.title}</strong>
                      {song.book || song.number
                        ? ` — ${[song.book, song.number].filter(Boolean).join(' ')}`
                        : ''}
                    </span>
                    {verse ? (
                      <span className="library-song-picker-verse" data-testid={`song-library-verse-${song.id}`}>
                        {verse}
                      </span>
                    ) : null}
                    <span
                      className="song-library-usage"
                      data-testid={`song-library-usage-${song.id}`}
                    >
                      Used in {used} deck{used === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="song-library-row-actions">
                    <button
                      type="button"
                      onClick={() => startEdit(song)}
                      disabled={busy}
                      data-testid={`song-library-edit-${song.id}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSong(song)}
                      disabled={busy}
                      data-testid={`song-library-delete-${song.id}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </main>
  );
}
