import React, { useRef, useState } from 'react';
import type { LibrarySong } from '../../domain/librarySong';
import {
  buildImportReviewPlan,
  defaultImportSelections,
  parseImportFileContent,
  resolveImportSelections,
  type ImportReviewPlan,
  type ImportSelections,
  type NoLyricsAction,
  type TitleMatchAction,
} from '../../domain/songImport';
import { remixDataUrl, REMIX_ROUTE_ID } from '../remixDataUrl';

/**
 * Import songs into the local song library through one review screen.
 * Never replaces or mutates an open presentation deck.
 */
export default function ImportSongsReview() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<ImportReviewPlan | null>(null);
  const [selections, setSelections] = useState<ImportSelections | null>(null);

  const loadLibrarySongs = async (): Promise<LibrarySong[]> => {
    const res = await fetch(remixDataUrl('/library/songs', REMIX_ROUTE_ID.librarySongs));
    if (!res.ok) throw new Error(`Failed to load library (${res.status})`);
    return (await res.json()) as LibrarySong[];
  };

  const commitSongs = async (payloads: ReturnType<typeof resolveImportSelections>) => {
    const res = await fetch(remixDataUrl('/library/songs/import', REMIX_ROUTE_ID.librarySongsImport), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs: payloads }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      importedCount?: number;
    };
    if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);
    setStatus(`Imported ${data.importedCount ?? payloads.length} song(s) into the library.`);
    setPlan(null);
    setSelections(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (file: File | null) => {
    setError(null);
    setStatus(null);
    setPlan(null);
    setSelections(null);
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const candidates = await parseImportFileContent(text, file.name);
      if (candidates.length === 0) {
        setError('No songs found in that file.');
        return;
      }
      const existing = await loadLibrarySongs();
      const nextPlan = buildImportReviewPlan(candidates, existing, file.name);
      const nextSelections = defaultImportSelections(nextPlan);
      if (!nextPlan.needsReview) {
        const payloads = resolveImportSelections(nextPlan, nextSelections);
        await commitSongs(payloads);
        return;
      }
      setPlan(nextPlan);
      setSelections(nextSelections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read import file.');
    } finally {
      setBusy(false);
    }
  };

  const toggleChecked = (key: string) => {
    if (!selections) return;
    const set = new Set(selections.checkedKeys);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    setSelections({ ...selections, checkedKeys: Array.from(set) });
  };

  const selectAll = (checked: boolean) => {
    if (!plan || !selections) return;
    setSelections({
      ...selections,
      checkedKeys: checked ? plan.candidates.map(c => c.key) : [],
    });
  };

  const handleImportClick = async () => {
    if (!plan || !selections) return;
    setError(null);
    setBusy(true);
    try {
      const payloads = resolveImportSelections(plan, selections);
      if (payloads.length === 0) {
        setError('Nothing to import. Check songs or change skip choices.');
        return;
      }
      await commitSongs(payloads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="import-songs-page" data-testid="import-songs-review">
      <h1>Import songs</h1>
      <p className="import-songs-lead">
        Import into your local song library from Doug&apos;s gathered book JSON or Poster song
        XML/JSON. This does not replace an open deck.
      </p>

      <label className="import-songs-file">
        Choose file
        <input
          ref={fileRef}
          type="file"
          accept=".json,.xml,application/json,text/xml"
          data-testid="import-songs-file"
          disabled={busy}
          onChange={e => void handleFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {error ? (
        <p className="import-songs-error" role="alert" data-testid="import-songs-error">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="import-songs-status" data-testid="import-songs-status">
          {status}
        </p>
      ) : null}

      {plan && selections ? (
        <section className="import-review" data-testid="import-review-screen">
          <h2>Review import: {plan.fileName}</h2>
          <p>
            {plan.candidates.length} song(s). Nothing is imported until you confirm.
          </p>

          <div className="import-review-checklist" data-testid="import-checklist">
            <div className="import-review-checklist-actions">
              <button type="button" onClick={() => selectAll(true)} data-testid="import-select-all">
                Select all
              </button>
              <button type="button" onClick={() => selectAll(false)} data-testid="import-select-none">
                Select none
              </button>
            </div>
            <ul>
              {plan.candidates.map(c => (
                <li key={c.key}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selections.checkedKeys.includes(c.key)}
                      onChange={() => toggleChecked(c.key)}
                      data-testid={`import-check-${c.key}`}
                    />{' '}
                    <strong>{c.title}</strong>
                    {c.book || c.number
                      ? ` — ${[c.book, c.number].filter(Boolean).join(' ')}`
                      : ''}
                    {!c.hasLyrics ? ' (no lyrics)' : ''}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {plan.noLyricsKeys.length > 0 ? (
            <div className="import-review-section" data-testid="import-no-lyrics-section">
              <h3>Songs with no lyrics</h3>
              <p>Choose one action for all no-lyrics songs that stay checked.</p>
              <label>
                <input
                  type="radio"
                  name="no-lyrics"
                  checked={selections.noLyricsAction === 'title_only'}
                  onChange={() =>
                    setSelections({ ...selections, noLyricsAction: 'title_only' as NoLyricsAction })
                  }
                  data-testid="import-no-lyrics-title-only"
                />{' '}
                Import as title only
              </label>
              <label>
                <input
                  type="radio"
                  name="no-lyrics"
                  checked={selections.noLyricsAction === 'skip'}
                  onChange={() =>
                    setSelections({ ...selections, noLyricsAction: 'skip' as NoLyricsAction })
                  }
                  data-testid="import-no-lyrics-skip"
                />{' '}
                Skip them
              </label>
            </div>
          ) : null}

          {plan.titleMatches.length > 0 ? (
            <div className="import-review-section" data-testid="import-title-match-section">
              <h3>Title matches</h3>
              {plan.titleMatches.map(m => (
                <div
                  key={m.candidateKey}
                  className="import-title-match"
                  data-testid={`import-title-match-${m.candidateKey}`}
                >
                  <p>
                    <strong>{m.existingTitle}</strong> already exists.
                  </p>
                  <div className="import-title-match-compare">
                    <div>
                      <h4>In library</h4>
                      <p>Number: {m.existingNumber ?? '(none)'}</p>
                      <p>Lyrics: {m.existingLyricsPreview}</p>
                    </div>
                    <div>
                      <h4>Incoming</h4>
                      <p>Number: {m.incomingNumber ?? '(none)'}</p>
                      <p>Lyrics: {m.incomingLyricsPreview}</p>
                    </div>
                  </div>
                  {(
                    [
                      ['keep_both', 'Keep both (default)'],
                      ['replace', 'Replace library song'],
                      ['skip', 'Skip incoming'],
                    ] as [TitleMatchAction, string][]
                  ).map(([value, label]) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name={`match-${m.candidateKey}`}
                        checked={
                          (selections.titleMatchActions[m.candidateKey] ?? 'keep_both') === value
                        }
                        onChange={() =>
                          setSelections({
                            ...selections,
                            titleMatchActions: {
                              ...selections.titleMatchActions,
                              [m.candidateKey]: value,
                            },
                          })
                        }
                        data-testid={`import-match-${m.candidateKey}-${value}`}
                      />{' '}
                      {label}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            className="import-confirm"
            disabled={busy}
            onClick={() => void handleImportClick()}
            data-testid="import-confirm"
          >
            {busy ? 'Importing...' : 'Import'}
          </button>
        </section>
      ) : null}

      <p>
        <a href="/library/songs/add">Add a song by hand</a>
        {' · '}
        <a href="/">Back to Home</a>
      </p>
    </main>
  );
}
