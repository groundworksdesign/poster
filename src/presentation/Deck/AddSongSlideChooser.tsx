import React, { useRef, useState } from 'react';
import type { LibrarySong, LibrarySongInput } from '../../domain/librarySong';
import type { SongData } from '../../domain/PresentTypes';
import {
  buildImportReviewPlan,
  defaultImportSelections,
  parseImportFileContent,
  resolveImportSelections,
  type ImportReviewPlan,
  type ImportSelections,
} from '../../domain/songImport';
import ImportReviewScreen from '../SongLibrary/ImportReviewScreen';
import { remixDataUrl, REMIX_ROUTE_ID } from '../remixDataUrl';
import LibrarySongPicker from './LibrarySongPicker';

export type SongSlideChoice = {
  lyrics: SongData;
  librarySongId?: string;
  book?: string | null;
  number?: string | null;
};

type Mode = 'pick' | 'import';

type Props = {
  onCancel: () => void;
  /** Insert song slide(s); must not replace the deck. Accepts one or many. */
  onChoose: (choice: SongSlideChoice | SongSlideChoice[]) => void;
};

function payloadsToChoices(
  payloads: LibrarySongInput[],
  ids?: string[],
): SongSlideChoice[] {
  return payloads.map((p, i) => ({
    lyrics: {
      title: p.lyrics.title || p.title,
      author: p.lyrics.author,
      verses: p.lyrics.verses ?? [],
    },
    librarySongId: ids?.[i],
    book: p.book,
    number: p.number,
  }));
}

/**
 * Add song slide chooser: Pick from library (default) or Import a file.
 * Import uses the same review screen as library import (no-lyrics / title-match).
 * "Also save to my library" is checked by default.
 */
export default function AddSongSlideChooser({ onCancel, onChoose }: Props) {
  const [mode, setMode] = useState<Mode>('pick');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [alsoSave, setAlsoSave] = useState(true);
  const [plan, setPlan] = useState<ImportReviewPlan | null>(null);
  const [selections, setSelections] = useState<ImportSelections | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      ids?: string[];
    };
    if (!res.ok) throw new Error(data.error || `Library save failed (${res.status})`);
    return Array.isArray(data.ids) ? data.ids : [];
  };

  const finishWithPayloads = async (payloads: LibrarySongInput[]) => {
    if (payloads.length === 0) {
      setError('Nothing to add. Check songs or change skip choices.');
      return;
    }
    let ids: string[] | undefined;
    if (alsoSave) {
      ids = await savePayloads(payloads);
    }
    onChoose(payloadsToChoices(payloads, ids));
  };

  const handleImportFile = async (file: File | null) => {
    setError(null);
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
        await finishWithPayloads(payloads);
        return;
      }
      setPlan(nextPlan);
      setSelections(nextSelections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file.');
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
      await finishWithPayloads(payloads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="add-song-chooser" data-testid="add-song-slide-chooser">
      <h2>Add song slide</h2>
      <p>Pick a library song or import a file. The new slide is added to this deck; other slides stay.</p>

      <div className="add-song-chooser-modes" role="radiogroup" aria-label="Add song source">
        <label>
          <input
            type="radio"
            name="add-song-mode"
            checked={mode === 'pick'}
            onChange={() => setMode('pick')}
            data-testid="add-song-mode-pick"
          />{' '}
          Pick from library
        </label>
        <label>
          <input
            type="radio"
            name="add-song-mode"
            checked={mode === 'import'}
            onChange={() => setMode('import')}
            data-testid="add-song-mode-import"
          />{' '}
          Import a file
        </label>
      </div>

      {mode === 'pick' ? (
        <div data-testid="add-song-pick-panel">
          <LibrarySongPicker onPick={onChoose} onSwitchToImport={() => setMode('import')} />
        </div>
      ) : (
        <div data-testid="add-song-import-panel">
          <label>
            Song file
            <input
              ref={fileRef}
              type="file"
              accept=".json,.xml,application/json,text/xml"
              data-testid="add-song-import-file"
              disabled={busy}
              onChange={e => {
                const f = e.target.files?.[0] ?? null;
                if (f && !(f as any).text) {
                  (f as any).text = () =>
                    new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result));
                      reader.onerror = () => reject(reader.error);
                      reader.readAsText(f);
                    });
                }
                void handleImportFile(f);
              }}
            />
          </label>

          <label className="add-song-also-save" data-testid="add-song-also-save-label">
            <input
              type="checkbox"
              checked={alsoSave}
              onChange={e => setAlsoSave(e.target.checked)}
              data-testid="add-song-also-save"
            />{' '}
            Also save to my library
          </label>

          {plan && selections ? (
            <ImportReviewScreen
              plan={plan}
              selections={selections}
              busy={busy}
              confirmLabel="Add song slide"
              busyLabel="Adding..."
              onChange={setSelections}
              onConfirm={() => void confirmReview()}
            />
          ) : null}
        </div>
      )}

      {error ? (
        <p className="add-song-chooser-error" role="alert" data-testid="add-song-chooser-error">
          {error}
        </p>
      ) : null}

      <p className="add-song-chooser-library-link">
        <a href="/library/songs" data-testid="add-song-open-library">
          Open song library
        </a>
      </p>

      <button type="button" onClick={onCancel} data-testid="add-song-chooser-cancel">
        Cancel
      </button>
    </section>
  );
}
