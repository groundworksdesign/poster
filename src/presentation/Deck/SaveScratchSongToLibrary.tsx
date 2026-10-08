import React, { useState } from 'react';
import type { LibrarySong, LibrarySongInput } from '../../domain/librarySong';
import type { SongData } from '../../domain/PresentTypes';
import {
  buildImportReviewPlan,
  defaultImportSelections,
  resolveImportSelections,
  type ImportCandidate,
  type ImportReviewPlan,
  type ImportSelections,
} from '../../domain/songImport';
import ImportReviewScreen from '../SongLibrary/ImportReviewScreen';
import { remixDataUrl, REMIX_ROUTE_ID } from '../remixDataUrl';

type Props = {
  lyrics: SongData;
  onLinked: (librarySongId: string, lyrics: SongData) => void;
  onCancel: () => void;
};

function candidateFromLyrics(lyrics: SongData): ImportCandidate {
  const verses = Array.isArray(lyrics.verses) ? lyrics.verses : [];
  const hasLyrics = verses.some(v =>
    Array.isArray(v.lines) && v.lines.some(l => String(l).trim().length > 0),
  );
  const title = (lyrics.title || '').trim() || 'Untitled';
  return {
    key: 'scratch-save',
    title,
    book: null,
    number: null,
    author: typeof lyrics.author === 'string' ? lyrics.author : null,
    verses,
    hasLyrics,
  };
}

/**
 * Save a scratch song slide into the library through the shared ImportReviewScreen.
 * Cancel leaves the slide unlinked; confirm sets librarySongId on the caller.
 */
export default function SaveScratchSongToLibrary({ lyrics, onLinked, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<ImportReviewPlan | null>(null);
  const [selections, setSelections] = useState<ImportSelections | null>(null);
  const [started, setStarted] = useState(false);

  const loadLibrarySongs = async (): Promise<LibrarySong[]> => {
    const res = await fetch(remixDataUrl('/library/songs', REMIX_ROUTE_ID.librarySongs));
    if (!res.ok) throw new Error(`Failed to load library (${res.status})`);
    return (await res.json()) as LibrarySong[];
  };

  const savePayloads = async (payloads: LibrarySongInput[]): Promise<string[]> => {
    const res = await fetch(
      remixDataUrl('/library/songs/import', REMIX_ROUTE_ID.librarySongsImport),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: payloads }),
      },
    );
    const data = (await res.json().catch(() => ({}))) as { error?: string; ids?: string[] };
    if (!res.ok) throw new Error(data.error || `Library save failed (${res.status})`);
    return Array.isArray(data.ids) ? data.ids : [];
  };

  const startReview = async () => {
    setError(null);
    setBusy(true);
    setStarted(true);
    try {
      const existing = await loadLibrarySongs();
      const nextPlan = buildImportReviewPlan(
        [candidateFromLyrics(lyrics)],
        existing,
        'Save to library',
      );
      const nextSelections = defaultImportSelections(nextPlan);
      if (!nextPlan.needsReview) {
        const payloads = resolveImportSelections(nextPlan, nextSelections);
        if (payloads.length === 0) {
          setError('Nothing to save.');
          return;
        }
        const ids = await savePayloads(payloads);
        const id = ids[0];
        if (!id) throw new Error('Library save did not return an id');
        onLinked(id, {
          title: payloads[0].lyrics.title || payloads[0].title,
          author: payloads[0].lyrics.author,
          verses: payloads[0].lyrics.verses ?? [],
        });
        return;
      }
      setPlan(nextPlan);
      setSelections(nextSelections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start save.');
    } finally {
      setBusy(false);
    }
  };

  const confirmReview = async () => {
    if (!plan || !selections) return;
    setError(null);
    setBusy(true);
    try {
      const payloads = resolveImportSelections(plan, selections);
      if (payloads.length === 0) {
        setError('Nothing to save. Check skip choices.');
        return;
      }
      const ids = await savePayloads(payloads);
      const id = ids[0];
      if (!id) throw new Error('Library save did not return an id');
      onLinked(id, {
        title: payloads[0].lyrics.title || payloads[0].title,
        author: payloads[0].lyrics.author,
        verses: payloads[0].lyrics.verses ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!started) {
    return (
      <button
        type="button"
        data-testid="save-scratch-to-library"
        onClick={() => void startReview()}
        disabled={busy}
      >
        Save to library
      </button>
    );
  }

  return (
    <div className="save-scratch-to-library" data-testid="save-scratch-to-library-panel">
      {plan && selections ? (
        <ImportReviewScreen
          plan={plan}
          selections={selections}
          busy={busy}
          confirmLabel="Save to library"
          busyLabel="Saving..."
          onChange={setSelections}
          onConfirm={() => void confirmReview()}
        />
      ) : busy ? (
        <p data-testid="save-scratch-busy">Preparing save…</p>
      ) : null}
      {error ? (
        <p className="save-scratch-error" role="alert" data-testid="save-scratch-error">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="save-scratch-cancel"
        disabled={busy}
        onClick={() => {
          setStarted(false);
          setPlan(null);
          setSelections(null);
          setError(null);
          onCancel();
        }}
      >
        Cancel
      </button>
    </div>
  );
}
