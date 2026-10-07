import React, { useRef, useState } from 'react';
import type { SongData } from '../../domain/PresentTypes';
import { parseImportFileContent, type ImportCandidate } from '../../domain/songImport';
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
  /** Append this song as a new slide; must not replace the deck. */
  onChoose: (choice: SongSlideChoice) => void;
};

/**
 * Add song slide chooser: Pick from library (default) or Import a file.
 * Import shows "Also save to my library" checked by default on the same screen.
 */
export default function AddSongSlideChooser({ onCancel, onChoose }: Props) {
  const [mode, setMode] = useState<Mode>('pick');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [alsoSave, setAlsoSave] = useState(true);
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[] | null>(null);
  const [selectedImportKey, setSelectedImportKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (file: File | null) => {
    setError(null);
    setImportCandidates(null);
    setSelectedImportKey(null);
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const candidates = await parseImportFileContent(text, file.name);
      if (candidates.length === 0) {
        setError('No songs found in that file.');
        return;
      }
      setImportCandidates(candidates);
      setSelectedImportKey(candidates[0].key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file.');
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!importCandidates || !selectedImportKey) return;
    const chosen = importCandidates.find(c => c.key === selectedImportKey);
    if (!chosen) return;
    setError(null);
    setBusy(true);
    try {
      let librarySongId: string | undefined;
      if (alsoSave) {
        const res = await fetch(remixDataUrl('/library/songs/save', REMIX_ROUTE_ID.librarySongsSave), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: chosen.title,
            book: chosen.book,
            number: chosen.number,
            author: chosen.author,
            lyrics: {
              title: chosen.title,
              author: chosen.author ?? undefined,
              verses: chosen.verses,
            },
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
        if (!res.ok) {
          setError(data.error || `Library save failed (${res.status})`);
          return;
        }
        librarySongId = data.id;
      }
      onChoose({
        lyrics: {
          title: chosen.title,
          author: chosen.author ?? undefined,
          verses: chosen.verses,
        },
        librarySongId,
        book: chosen.book,
        number: chosen.number,
      });
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

          {importCandidates ? (
            <div data-testid="add-song-import-candidates">
              {importCandidates.length > 1 ? (
                <p>Choose which song to add as a slide:</p>
              ) : null}
              <ul>
                {importCandidates.map(c => (
                  <li key={c.key}>
                    <label>
                      <input
                        type="radio"
                        name="import-song"
                        checked={selectedImportKey === c.key}
                        onChange={() => setSelectedImportKey(c.key)}
                        data-testid={`add-song-import-pick-${c.key}`}
                      />{' '}
                      <strong>{c.title}</strong>
                      {c.book || c.number
                        ? ` — ${[c.book, c.number].filter(Boolean).join(' ')}`
                        : ''}
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={busy || !selectedImportKey}
                onClick={() => void confirmImport()}
                data-testid="add-song-import-confirm"
              >
                {busy ? 'Adding...' : 'Add song slide'}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="add-song-chooser-error" role="alert" data-testid="add-song-chooser-error">
          {error}
        </p>
      ) : null}

      <button type="button" onClick={onCancel} data-testid="add-song-chooser-cancel">
        Cancel
      </button>
    </section>
  );
}
