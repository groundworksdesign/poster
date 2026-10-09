import React, { useState } from 'react';
import { parseVersesText } from '../../domain/librarySong';
import { remixDataUrl, REMIX_ROUTE_ID } from '../remixDataUrl';

type FindResult = {
  id: string;
  title: string;
  book: string | null;
  number: string | null;
};

/**
 * Hand-add one library song (title, book, number, verses).
 * After save, the song can be found via the same-page search (AC-002).
 */
export default function AddSongByHand() {
  const [title, setTitle] = useState('');
  const [book, setBook] = useState('');
  const [number, setNumber] = useState('');
  const [versesText, setVersesText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findResults, setFindResults] = useState<FindResult[] | null>(null);
  const [finding, setFinding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    const verses = parseVersesText(versesText);
    setSaving(true);
    try {
      const res = await fetch(remixDataUrl('/library/songs/save', REMIX_ROUTE_ID.librarySongsSave), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          book: book.trim() || null,
          number: number.trim() || null,
          lyrics: {
            title: trimmedTitle,
            verses,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      setStatus(`Saved "${trimmedTitle}" to the song library.`);
      setFindQuery(trimmedTitle);
      await runFind(trimmedTitle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error saving song.');
    } finally {
      setSaving(false);
    }
  };

  const runFind = async (query: string) => {
    setFinding(true);
    setFindResults(null);
    try {
      const url = remixDataUrl('/library/songs', REMIX_ROUTE_ID.librarySongs);
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(`${url}${sep}q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setError(`Find failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as FindResult[];
      setFindResults(data);
    } catch {
      setError('Network error finding songs.');
    } finally {
      setFinding(false);
    }
  };

  const handleFind = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    await runFind(findQuery);
  };

  return (
    <main className="add-song-page" data-testid="add-song-by-hand">
      <h1>Add a song</h1>
      <p className="add-song-page-lead">
        Enter one song into your local library. Blank lines in lyrics start a new verse.
      </p>

      <form className="add-song-form" onSubmit={handleSubmit} data-testid="add-song-form">
        <label>
          Title
          <input
            type="text"
            name="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            data-testid="add-song-title"
          />
        </label>
        <label>
          Book
          <input
            type="text"
            name="book"
            value={book}
            onChange={e => setBook(e.target.value)}
            data-testid="add-song-book"
          />
        </label>
        <label>
          Number
          <input
            type="text"
            name="number"
            value={number}
            onChange={e => setNumber(e.target.value)}
            data-testid="add-song-number"
          />
        </label>
        <label>
          Verses
          <textarea
            name="verses"
            value={versesText}
            onChange={e => setVersesText(e.target.value)}
            rows={10}
            placeholder={'Line one of verse 1\nLine two of verse 1\n\nLine one of verse 2'}
            data-testid="add-song-verses"
          />
        </label>
        <button type="submit" disabled={saving} data-testid="add-song-submit">
          {saving ? 'Saving…' : 'Save to library'}
        </button>
      </form>

      {error ? (
        <p className="add-song-error" role="alert" data-testid="add-song-error">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="add-song-status" data-testid="add-song-status">
          {status}
        </p>
      ) : null}

      <section className="add-song-find" aria-label="Find library songs">
        <h2>Find in library</h2>
        <form className="add-song-find-form" onSubmit={handleFind} data-testid="find-song-form">
          <label>
            Search
            <input
              type="search"
              name="q"
              value={findQuery}
              onChange={e => setFindQuery(e.target.value)}
              data-testid="find-song-query"
            />
          </label>
          <button type="submit" disabled={finding} data-testid="find-song-submit">
            {finding ? 'Searching…' : 'Find'}
          </button>
        </form>
        {findResults ? (
          <ul data-testid="find-song-results">
            {findResults.length === 0 ? (
              <li data-testid="find-song-empty">No songs match.</li>
            ) : (
              findResults.map(song => (
                <li key={song.id} data-testid="find-song-row">
                  <strong>{song.title}</strong>
                  {song.book || song.number
                    ? ` — ${[song.book, song.number].filter(Boolean).join(' ')}`
                    : ''}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </section>

      <p>
        <a href="/library/songs" data-testid="add-song-to-library">
          Song library
        </a>
        {' · '}
        <a href="/library/songs/import">Import songs from a file</a>
        {' · '}
        <a href="/">Back to Home</a>
      </p>
    </main>
  );
}
