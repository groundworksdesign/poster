import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { LibrarySong } from '../../domain/librarySong';
import { parseVersesText, versesToText } from '../../domain/librarySong';
import {
  filterSongsByBook,
  firstVerseLine,
  shouldShowFirstVerse,
  uniqueBooks,
} from '../../domain/librarySongPicker';
import type { SongData } from '../../domain/PresentTypes';
import { remixDataUrl, REMIX_ROUTE_ID } from '../remixDataUrl';
import UpdateDecksPrompt, { type DeckUsageOption } from './UpdateDecksPrompt';

export type LibrarySongRow = LibrarySong & { usedInDeckCount?: number };

type PendingDeckPrompt = {
  mode: 'edit' | 'delete';
  songId: string;
  songTitle: string;
  baselineLyrics: SongData;
  decks: DeckUsageOption[];
  /** For delete: finish library delete after prompt. */
  deleteAfter?: boolean;
};

function songBaseline(song: LibrarySongRow): SongData {
  return {
    title: song.lyrics?.title || song.title,
    author: song.lyrics?.author ?? song.author ?? undefined,
    verses: song.lyrics?.verses ?? [],
  };
}

/**
 * Manage song library: search, Add / Edit / Delete / Import, used-in-N-decks,
 * and linked deck-update confirms (REQ-012, 015, 016, 023).
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
  const [deckPrompt, setDeckPrompt] = useState<PendingDeckPrompt | null>(null);

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

  const fetchDeckUsage = async (
    songId: string,
    baselineLyrics: SongData,
  ): Promise<DeckUsageOption[]> => {
    const res = await fetch(
      remixDataUrl(`/library/songs/${songId}/decks`, REMIX_ROUTE_ID.librarySongsDecks),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baselineLyrics }),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      decks?: DeckUsageOption[];
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || `Failed to load deck usage (${res.status})`);
    return Array.isArray(data.decks) ? data.decks : [];
  };

  const finishLibraryDelete = async (songId: string, songTitle: string) => {
    const res = await fetch(
      remixDataUrl(`/library/songs/delete/${songId}`, REMIX_ROUTE_ID.librarySongsDelete),
      { method: 'POST' },
    );
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || `Delete failed (${res.status})`);
    setStatus(`Deleted "${songTitle}" from the library.`);
    if (editing?.id === songId) setEditing(null);
    await fetchSongs(debouncedQuery);
  };

  const applyDeckUpdates = async (
    prompt: PendingDeckPrompt,
    deckIds: string[],
    overwriteHandEdited: boolean,
  ) => {
    setBusy(true);
    setError(null);
    try {
      if (deckIds.length > 0) {
        const res = await fetch(
          remixDataUrl(
            `/library/songs/${prompt.songId}/apply-decks`,
            REMIX_ROUTE_ID.librarySongsApplyDecks,
          ),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: prompt.mode,
              deckIds,
              baselineLyrics: prompt.baselineLyrics,
              overwriteHandEdited,
            }),
          },
        );
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          decksUpdated?: number;
          slidesChanged?: number;
        };
        if (!res.ok) throw new Error(data.error || `Deck update failed (${res.status})`);
        const verb = prompt.mode === 'edit' ? 'Updated' : 'Removed slides in';
        setStatus(
          `${verb} ${data.decksUpdated ?? 0} deck(s) (${data.slidesChanged ?? 0} slide(s)) for "${prompt.songTitle}".`,
        );
      }
      if (prompt.deleteAfter) {
        await finishLibraryDelete(prompt.songId, prompt.songTitle);
      }
      setDeckPrompt(null);
      await fetchSongs(debouncedQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deck update failed.');
    } finally {
      setBusy(false);
    }
  };

  const skipDeckUpdates = async (prompt: PendingDeckPrompt) => {
    setBusy(true);
    setError(null);
    try {
      if (prompt.deleteAfter) {
        await finishLibraryDelete(prompt.songId, prompt.songTitle);
      } else {
        setStatus(`Library updated. Decks left unchanged for "${prompt.songTitle}".`);
      }
      setDeckPrompt(null);
      await fetchSongs(debouncedQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (song: LibrarySongRow) => {
    setStatus(null);
    setError(null);
    setDeckPrompt(null);
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
    const baselineLyrics = songBaseline(editing);
    const songId = editing.id;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const verses = parseVersesText(editVerses);
      const res = await fetch(remixDataUrl('/library/songs/save', REMIX_ROUTE_ID.librarySongsSave), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: songId,
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
      setEditing(null);
      const decks = await fetchDeckUsage(songId, baselineLyrics);
      if (decks.length === 0) {
        // AC-018: unused songs edit without a deck prompt.
        setStatus(`Updated "${trimmed}" in the library.`);
        await fetchSongs(debouncedQuery);
        return;
      }
      setStatus(`Updated "${trimmed}" in the library.`);
      setDeckPrompt({
        mode: 'edit',
        songId,
        songTitle: trimmed,
        baselineLyrics,
        decks,
      });
      // Release busy before list refresh so Apply is clickable while songs reload.
      setBusy(false);
      await fetchSongs(debouncedQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error saving song.');
    } finally {
      setBusy(false);
    }
  };

  const deleteSong = async (song: LibrarySongRow) => {
    const used = song.usedInDeckCount ?? 0;
    if (used === 0) {
      // AC-018: unused songs delete without a deck prompt.
      if (!window.confirm(`Delete "${song.title}" from the library?`)) return;
      setBusy(true);
      setError(null);
      setStatus(null);
      try {
        await finishLibraryDelete(song.id, song.title);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error deleting song.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!window.confirm(`Delete "${song.title}" from the library?`)) return;

    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const baselineLyrics = songBaseline(song);
      const decks = await fetchDeckUsage(song.id, baselineLyrics);
      if (decks.length === 0) {
        await finishLibraryDelete(song.id, song.title);
        return;
      }
      setDeckPrompt({
        mode: 'delete',
        songId: song.id,
        songTitle: song.title,
        baselineLyrics,
        decks,
        deleteAfter: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error preparing delete.');
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

      {deckPrompt ? (
        <UpdateDecksPrompt
          mode={deckPrompt.mode}
          songTitle={deckPrompt.songTitle}
          decks={deckPrompt.decks}
          busy={busy}
          onConfirm={(deckIds, overwriteHandEdited) => {
            void applyDeckUpdates(deckPrompt, deckIds, overwriteHandEdited);
          }}
          onSkip={() => {
            void skipDeckUpdates(deckPrompt);
          }}
        />
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
            <button type="submit" disabled={busy || Boolean(deckPrompt)} data-testid="song-library-edit-save">
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={busy || Boolean(deckPrompt)}
              data-testid="song-library-edit-cancel"
            >
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
                      disabled={busy || Boolean(deckPrompt)}
                      data-testid={`song-library-edit-${song.id}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSong(song)}
                      disabled={busy || Boolean(deckPrompt)}
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
