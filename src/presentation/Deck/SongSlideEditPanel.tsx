import React, { useEffect, useRef, useState } from 'react';
import type { LibrarySong, LibrarySongInput } from '../../domain/librarySong';
import { parseVersesText, versesToText } from '../../domain/librarySong';
import type { SongData } from '../../domain/PresentTypes';
import {
  buildImportReviewPlan,
  defaultImportSelections,
  parseImportFileContent,
  resolveImportSelections,
  type ImportCandidate,
  type ImportReviewPlan,
  type ImportSelections,
} from '../../domain/songImport';
import ImportReviewScreen from '../SongLibrary/ImportReviewScreen';
import { remixDataUrl, REMIX_ROUTE_ID } from '../remixDataUrl';
import LibrarySongPicker from './LibrarySongPicker';
import type { SongSlideChoice } from './AddSongSlideChooser';

export type SongKind = 'linked' | 'scratch';

export type SongPanelCommit = {
  lyrics: SongData;
  librarySongId?: string;
  book?: string | null;
  number?: string | null;
  alsoSavedToLibrary?: boolean;
};

type Props = {
  initialKind?: SongKind | null;
  initialChoice?: SongSlideChoice | null;
  initialScratch?: {
    title: string;
    book?: string;
    number?: string;
    words: string;
    librarySongId?: string;
  } | null;
  onCommitReadyChange?: (ready: boolean) => void;
  getCommitRef?: React.MutableRefObject<
    (() => Promise<SongPanelCommit | SongPanelCommit[] | null>) | null
  >;
};

function candidateFromScratch(
  title: string,
  book: string,
  number: string,
  lyrics: SongData,
): ImportCandidate {
  const verses = Array.isArray(lyrics.verses) ? lyrics.verses : [];
  const hasLyrics = verses.some(
    v => Array.isArray(v.lines) && v.lines.some(l => String(l).trim().length > 0),
  );
  return {
    key: 'scratch-save',
    title: title.trim() || 'Untitled',
    book: book.trim() || null,
    number: number.trim() || null,
    author: null,
    verses,
    hasLyrics,
  };
}

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
 * Song body for the slide edit panel (Pam mockup + Roy decisions).
 */
export default function SongSlideEditPanel({
  initialKind = null,
  initialChoice = null,
  initialScratch = null,
  onCommitReadyChange,
  getCommitRef,
}: Props) {
  const [kind, setKind] = useState<SongKind | null>(initialKind);
  const [choice, setChoice] = useState<SongSlideChoice | null>(initialChoice);
  const [title, setTitle] = useState(initialScratch?.title ?? '');
  const [book, setBook] = useState(initialScratch?.book ?? '');
  const [number, setNumber] = useState(initialScratch?.number ?? '');
  const [words, setWords] = useState(initialScratch?.words ?? '');
  const [alsoSaveScratch, setAlsoSaveScratch] = useState(false);
  const [alsoSaveImport, setAlsoSaveImport] = useState(true);
  const [importPlan, setImportPlan] = useState<ImportReviewPlan | null>(null);
  const [importSelections, setImportSelections] = useState<ImportSelections | null>(null);
  const [importChoices, setImportChoices] = useState<SongSlideChoice[] | null>(null);
  const [scratchPlan, setScratchPlan] = useState<ImportReviewPlan | null>(null);
  const [scratchSelections, setScratchSelections] = useState<ImportSelections | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const linkedCardRef = useRef<HTMLDivElement>(null);

  const ready =
    Boolean(choice) ||
    Boolean(importChoices?.length) ||
    (kind === 'scratch' && title.trim().length > 0);

  useEffect(() => {
    onCommitReadyChange?.(ready);
  }, [ready, onCommitReadyChange]);

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

  useEffect(() => {
    if (!getCommitRef) return;
    getCommitRef.current = async () => {
      if (importChoices && importChoices.length > 0) return importChoices;
      if (choice) return choice;
      if (kind === 'scratch' && title.trim()) {
        const lyrics: SongData = {
          title: title.trim(),
          author: '',
          verses: parseVersesText(words),
        };
        if (!alsoSaveScratch) {
          return { lyrics, book: book || null, number: number || null };
        }
        setBusy(true);
        try {
          const existing = await loadLibrarySongs();
          const plan = buildImportReviewPlan(
            [candidateFromScratch(title, book, number, lyrics)],
            existing,
            'Save to library',
          );
          const selections = defaultImportSelections(plan);
          if (plan.needsReview) {
            setScratchPlan(plan);
            setScratchSelections(selections);
            setError('Resolve library save choices, then Save slide again.');
            return null;
          }
          const payloads = resolveImportSelections(plan, selections);
          if (payloads.length === 0) {
            return { lyrics, book: book || null, number: number || null };
          }
          const ids = await savePayloads(payloads);
          return {
            lyrics: {
              title: payloads[0].lyrics.title || payloads[0].title,
              author: payloads[0].lyrics.author,
              verses: payloads[0].lyrics.verses ?? [],
            },
            librarySongId: ids[0],
            book: payloads[0].book,
            number: payloads[0].number,
            alsoSavedToLibrary: true,
          };
        } finally {
          setBusy(false);
        }
      }
      return null;
    };
    return () => {
      getCommitRef.current = null;
    };
  });

  const openImportPicker = () => fileRef.current?.click();

  const handleImportFile = async (file: File | null) => {
    setError(null);
    setImportPlan(null);
    setImportSelections(null);
    setImportChoices(null);
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
        let ids: string[] | undefined;
        if (alsoSaveImport) ids = await savePayloads(payloads);
        const choices = payloadsToChoices(payloads, alsoSaveImport ? ids : undefined);
        setKind('linked');
        if (choices.length === 1) {
          setChoice(choices[0]);
          setImportChoices(null);
        } else {
          setChoice(null);
          setImportChoices(choices);
        }
        return;
      }
      setKind('linked');
      setImportPlan(nextPlan);
      setImportSelections(nextSelections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!importPlan || !importSelections) return;
    setBusy(true);
    setError(null);
    try {
      const payloads = resolveImportSelections(importPlan, importSelections);
      if (payloads.length === 0) {
        setError('Nothing to add.');
        return;
      }
      let ids: string[] | undefined;
      if (alsoSaveImport) ids = await savePayloads(payloads);
      const choices = payloadsToChoices(payloads, alsoSaveImport ? ids : undefined);
      setImportPlan(null);
      setImportSelections(null);
      if (choices.length === 1) {
        setChoice(choices[0]);
        setImportChoices(null);
      } else {
        setChoice(null);
        setImportChoices(choices);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const confirmScratchSave = async () => {
    if (!scratchPlan || !scratchSelections) return;
    setBusy(true);
    try {
      const payloads = resolveImportSelections(scratchPlan, scratchSelections);
      if (payloads.length === 0) {
        setScratchPlan(null);
        setScratchSelections(null);
        return;
      }
      const ids = await savePayloads(payloads);
      const c = payloadsToChoices(payloads, ids)[0];
      setChoice(c);
      setKind('linked');
      setScratchPlan(null);
      setScratchSelections(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (choice && linkedCardRef.current) linkedCardRef.current.focus();
  }, [choice]);

  return (
    <div className="song-slide-edit-panel" data-testid="song-slide-edit-panel">
      <input
        ref={fileRef}
        type="file"
        accept=".json,.xml,application/json,text/xml"
        style={{ display: 'none' }}
        data-testid="song-panel-import-file"
        onChange={e => {
          const f = e.target.files?.[0] ?? null;
          if (f && !(f as File & { text?: () => Promise<string> }).text) {
            (f as File & { text: () => Promise<string> }).text = () =>
              new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(reader.error);
                reader.readAsText(f);
              });
          }
          void handleImportFile(f);
        }}
      />

      {kind === null ? (
        <div data-testid="song-type-choice" className="song-type-choice">
          <p>
            Linked songs update when the library song changes. Scratch songs live only in this deck
            unless you save them.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              data-testid="song-type-linked"
              autoFocus
              onClick={() => setKind('linked')}
              style={{ flex: 1, minHeight: 72 }}
            >
              Linked song from the library
            </button>
            <button
              type="button"
              data-testid="song-type-scratch"
              onClick={() => setKind('scratch')}
              style={{ flex: 1, minHeight: 72 }}
            >
              Song from scratch
            </button>
          </div>
        </div>
      ) : (
        <div data-testid="song-type-switch" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            data-testid="song-type-linked"
            aria-pressed={kind === 'linked'}
            onClick={() => {
              setKind('linked');
              setScratchPlan(null);
            }}
          >
            Linked song
          </button>
          <button
            type="button"
            data-testid="song-type-scratch"
            aria-pressed={kind === 'scratch'}
            onClick={() => {
              setKind('scratch');
              setChoice(null);
              setImportPlan(null);
              setImportChoices(null);
            }}
          >
            Song from scratch
          </button>
        </div>
      )}

      {error ? (
        <p role="alert" className="song-panel-error">
          {error}
        </p>
      ) : null}

      {kind === 'linked' && !choice && !importPlan && !importChoices ? (
        <div data-testid="song-linked-search">
          <LibrarySongPicker onPick={c => setChoice(c)} onSwitchToImport={openImportPicker} />
          <p>
            <button type="button" data-testid="song-import-file-link" onClick={openImportPicker}>
              Import a song file instead
            </button>
          </p>
        </div>
      ) : null}

      {kind === 'linked' && importPlan && importSelections ? (
        <div data-testid="song-import-review">
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={alsoSaveImport}
              data-testid="song-also-save-import"
              onChange={e => setAlsoSaveImport(e.target.checked)}
            />
            Also save to my library
          </label>
          <ImportReviewScreen
            plan={importPlan}
            selections={importSelections}
            busy={busy}
            confirmLabel={`Add ${importSelections.checkedKeys.length} song slides`}
            onChange={setImportSelections}
            onConfirm={() => void confirmImport()}
          />
        </div>
      ) : null}

      {kind === 'linked' && choice ? (
        <div
          ref={linkedCardRef}
          tabIndex={-1}
          data-testid="song-linked-card"
          data-library-song-id={choice.librarySongId || ''}
          style={{ border: '1px solid #4a4', padding: 12, borderRadius: 4 }}
        >
          {choice.librarySongId ? (
            <p data-testid="slide-library-song-id" data-library-song-id={choice.librarySongId}>
              <strong>{choice.lyrics.title}</strong>{' '}
              <span data-testid="song-linked-badge" style={{ color: '#080', fontWeight: 600 }}>
                LINKED TO LIBRARY
              </span>
            </p>
          ) : (
            <p>
              <strong>{choice.lyrics.title}</strong>
            </p>
          )}
          <p>
            {[choice.book, choice.number].filter(Boolean).join(' · ')}
            {choice.lyrics.verses?.length
              ? ` · ${choice.lyrics.verses.length} verse${
                  choice.lyrics.verses.length === 1 ? '' : 's'
                }`
              : ''}
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#444' }}>
            {(choice.lyrics.verses?.[0]?.lines ?? []).slice(0, 4).join('\n')}
          </pre>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="song-change-song"
              onClick={() => {
                setChoice(null);
                setImportChoices(null);
              }}
            >
              Change song
            </button>
            <button
              type="button"
              data-testid="song-unlink"
              onClick={() => {
                setKind('scratch');
                setTitle(choice.lyrics.title);
                setBook(choice.book ?? '');
                setNumber(choice.number ?? '');
                setWords(versesToText(choice.lyrics.verses));
                setChoice(null);
                setAlsoSaveScratch(false);
              }}
            >
              Unlink (make a copy)
            </button>
            <a
              href="/library/songs"
              data-testid="song-edit-in-library"
              onClick={e => {
                e.preventDefault();
                window.open('/library/songs', 'posterSongLibrary', 'width=1280,height=720');
              }}
            >
              Edit in library
            </a>
          </div>
        </div>
      ) : null}

      {kind === 'scratch' ? (
        <div data-testid="song-scratch-editor">
          <div data-testid="slide-scratch-unlinked">
            <label>
              Title *{' '}
              <input
                type="text"
                value={title}
                data-testid="song-scratch-title"
                autoFocus
                onChange={e => setTitle(e.target.value)}
              />
            </label>
            <label style={{ marginLeft: 8 }}>
              Book{' '}
              <input
                type="text"
                value={book}
                data-testid="song-scratch-book"
                onChange={e => setBook(e.target.value)}
              />
            </label>
            <label style={{ marginLeft: 8 }}>
              Number{' '}
              <input
                type="text"
                value={number}
                data-testid="song-scratch-number"
                onChange={e => setNumber(e.target.value)}
              />
            </label>
            <div style={{ marginTop: 8 }}>
              <label>
                Words
                <textarea
                  value={words}
                  data-testid="song-scratch-words"
                  rows={10}
                  style={{ width: '100%', display: 'block' }}
                  onChange={e => setWords(e.target.value)}
                  placeholder="One line per lyric line. Blank line starts a new verse."
                />
              </label>
              <p style={{ color: '#666', fontSize: 13 }}>Shows two lines at a time in Present.</p>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={alsoSaveScratch}
                data-testid="song-also-save-scratch"
                onChange={e => setAlsoSaveScratch(e.target.checked)}
              />
              Also save to my library
            </label>
          </div>
          {scratchPlan && scratchSelections ? (
            <div data-testid="song-scratch-save-review" style={{ marginTop: 12 }}>
              <ImportReviewScreen
                plan={scratchPlan}
                selections={scratchSelections}
                busy={busy}
                confirmLabel="Save to library"
                onChange={setScratchSelections}
                onConfirm={() => void confirmScratchSave()}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {importChoices && importChoices.length > 1 ? (
        <p data-testid="song-multi-import-ready">
          {importChoices.length} songs ready — Save slide will add them all.
        </p>
      ) : null}
    </div>
  );
}
