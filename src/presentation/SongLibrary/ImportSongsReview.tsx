import React, { useRef, useState } from 'react';
import type { LibrarySong } from '../../domain/librarySong';
import {
  buildImportReviewPlan,
  defaultImportSelections,
  parseImportFileContent,
  resolveImportSelections,
  type ImportReviewPlan,
  type ImportSelections,
} from '../../domain/songImport';
import { remixDataUrl, REMIX_ROUTE_ID } from '../remixDataUrl';
import ImportReviewScreen from './ImportReviewScreen';

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
        <ImportReviewScreen
          plan={plan}
          selections={selections}
          busy={busy}
          onChange={setSelections}
          onConfirm={() => void handleImportClick()}
        />
      ) : null}

      <p>
        <a href="/library/songs/add">Add a song by hand</a>
        {' · '}
        <a href="/">Back to Home</a>
      </p>
    </main>
  );
}
