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
import { lyricsFingerprint } from '../../domain/linkedSongUpdate';
import LibrarySongPicker from './LibrarySongPicker';
import type { SongSlideChoice } from './AddSongSlideChooser';

export type SongKind = 'linked' | 'scratch';

export type SongPanelCommit = {
  lyrics: SongData;
  librarySongId?: string;
  book?: string | null;
  number?: string | null;
  alsoSavedToLibrary?: boolean;
  /** True when saving hand-edited words that differ from the last library sync. */
  handEdited?: boolean;
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
  /** Existing linked slide: words fingerprint from last library sync. */
  linkedFingerprint?: string | null;
  onCommitReadyChange?: (ready: boolean) => void;
  /** Request parent to run Save slide (Ctrl/Cmd+Enter from card / scratch). */
  onRequestSaveSlide?: () => void;
  /** State E: move focus to Save slide after a song is chosen. */
  onFocusSaveSlide?: () => void;
  /** Esc at type choice on a pending new slide — cancel (leave nothing). */
  onCancelNewSlide?: () => void;
  /** Esc on an existing slide — parent confirms unsaved then closes. */
  onEscapeExistingSlide?: () => void;
  /** True while editing a pending new song slide (not yet in the deck). */
  isPendingNewSlide?: boolean;
  getCommitRef?: React.MutableRefObject<
    (() => Promise<SongPanelCommit | SongPanelCommit[] | null>) | null
  >;
  /** Parent can invoke the same Esc back-out used by the panel key handler. */
  escapeRef?: React.MutableRefObject<(() => void) | null>;
  /** Parent reads local unsaved song edits (words/title) for Esc confirm. */
  isDirtyRef?: React.MutableRefObject<(() => boolean) | null>;
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

function lyricsFromScratch(title: string, words: string): SongData {
  return {
    title: title.trim(),
    author: '',
    verses: parseVersesText(words),
  };
}

/**
 * Song body for the slide edit panel (Pam mockup + Roy decisions).
 * Library mutations run only inside getCommit (Save slide) — never on file pick,
 * import confirm, or scratch review confirm.
 */
export default function SongSlideEditPanel({
  initialKind = null,
  initialChoice = null,
  initialScratch = null,
  linkedFingerprint = null,
  onCommitReadyChange,
  onRequestSaveSlide,
  onFocusSaveSlide,
  onCancelNewSlide,
  onEscapeExistingSlide,
  isPendingNewSlide = false,
  getCommitRef,
  escapeRef,
  isDirtyRef,
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
  /** Payloads staged for library write on Save slide (import or scratch review). */
  const [pendingLibraryPayloads, setPendingLibraryPayloads] = useState<LibrarySongInput[] | null>(
    null,
  );
  const [scratchPlan, setScratchPlan] = useState<ImportReviewPlan | null>(null);
  const [scratchSelections, setScratchSelections] = useState<ImportSelections | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [handEditUnlocked, setHandEditUnlocked] = useState(false);
  /** Current library song words (fetched by id) — source for "Use library words". */
  const [libraryWords, setLibraryWords] = useState<string | null>(null);
  const [libraryWordsReady, setLibraryWordsReady] = useState(false);
  /** Type-choice keyboard focus (Left/Right move focus only; Enter/Space picks). */
  const [typeFocus, setTypeFocus] = useState<SongKind>('linked');
  const fileRef = useRef<HTMLInputElement>(null);
  const linkedCardRef = useRef<HTMLDivElement>(null);
  const typeLinkedRef = useRef<HTMLButtonElement>(null);
  const typeScratchRef = useRef<HTMLButtonElement>(null);
  const libraryWordsRef = useRef<string | null>(null);

  const ready =
    Boolean(choice) ||
    Boolean(importChoices?.length) ||
    (kind === 'scratch' && title.trim().length > 0 && !scratchPlan);

  useEffect(() => {
    onCommitReadyChange?.(ready);
  }, [ready, onCommitReadyChange]);

  const loadLibrarySongs = async (): Promise<LibrarySong[]> => {
    const res = await fetch(remixDataUrl('/library/songs', REMIX_ROUTE_ID.librarySongs));
    if (!res.ok) throw new Error(`Failed to load library (${res.status})`);
    return (await res.json()) as LibrarySong[];
  };

  // State I: load CURRENT library words by id (not the slide's own lyrics).
  useEffect(() => {
    const id = initialChoice?.librarySongId;
    if (!id) {
      setLibraryWords(null);
      libraryWordsRef.current = null;
      setLibraryWordsReady(true);
      return;
    }
    let cancelled = false;
    setLibraryWordsReady(false);
    void (async () => {
      try {
        const songs = await loadLibrarySongs();
        if (cancelled) return;
        const song = songs.find(s => s.id === id);
        const libText = song ? versesToText(song.lyrics?.verses) : null;
        setLibraryWords(libText);
        libraryWordsRef.current = libText;
        const slideText = versesToText(initialChoice?.lyrics?.verses);
        if (libText !== null && slideText !== libText) {
          // Already hand-edited: unlock editor + show yellow note immediately.
          setWords(slideText);
          setHandEditUnlocked(true);
        }
      } finally {
        if (!cancelled) setLibraryWordsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only re-fetch when the linked id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChoice?.librarySongId]);

  // Empty library → prefer Scratch on type choice (spec state A).
  useEffect(() => {
    if (kind !== null || !isPendingNewSlide) return;
    let cancelled = false;
    void (async () => {
      try {
        const songs = await loadLibrarySongs();
        if (cancelled) return;
        if (songs.length === 0) {
          setTypeFocus('scratch');
          typeScratchRef.current?.focus();
        } else {
          setTypeFocus('linked');
          typeLinkedRef.current?.focus();
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, isPendingNewSlide]);

  useEffect(() => {
    if (kind === null) {
      (typeFocus === 'scratch' ? typeScratchRef : typeLinkedRef).current?.focus();
    }
  }, [typeFocus, kind]);

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

  const stageImportPayloads = (payloads: LibrarySongInput[]) => {
    setPendingLibraryPayloads(payloads);
    const choices = payloadsToChoices(payloads);
    setKind('linked');
    setImportPlan(null);
    setImportSelections(null);
    if (choices.length === 1) {
      setChoice(choices[0]);
      setImportChoices(null);
    } else {
      setChoice(null);
      setImportChoices(choices);
    }
  };

  // Keep commit fn on the ref every render (no cleanup null — that raced callers).
  if (getCommitRef) {
    getCommitRef.current = async () => {
      // Multi-song import staged in panel memory.
      if (importChoices && importChoices.length > 0) {
        if (alsoSaveImport && pendingLibraryPayloads?.length) {
          setBusy(true);
          try {
            const ids = await savePayloads(pendingLibraryPayloads);
            setPendingLibraryPayloads(null);
            return payloadsToChoices(pendingLibraryPayloads, ids);
          } finally {
            setBusy(false);
          }
        }
        return importChoices;
      }

      // Linked / staged single import choice.
      if (choice) {
        if (alsoSaveImport && pendingLibraryPayloads?.length) {
          setBusy(true);
          try {
            const ids = await savePayloads(pendingLibraryPayloads);
            const withIds = payloadsToChoices(pendingLibraryPayloads, ids);
            setPendingLibraryPayloads(null);
            setChoice(withIds[0]);
            return withIds[0];
          } finally {
            setBusy(false);
          }
        }
        // Also-save unchecked: commit as scratch (no library id).
        if (pendingLibraryPayloads?.length && !alsoSaveImport) {
          setPendingLibraryPayloads(null);
          return {
            lyrics: choice.lyrics,
            book: choice.book,
            number: choice.number,
          };
        }
        const libText = libraryWordsRef.current;
        const slideText = versesToText(choice.lyrics?.verses);
        const sameLinkedId =
          Boolean(choice.librarySongId) &&
          Boolean(initialChoice?.librarySongId) &&
          choice.librarySongId === initialChoice?.librarySongId;
        const differsFromSynced =
          Boolean(linkedFingerprint) &&
          lyricsFingerprint(choice.lyrics) !== linkedFingerprint;
        const differsFromLibrary = libText === null || slideText !== libText;
        const handEdited = Boolean(sameLinkedId && differsFromSynced && differsFromLibrary);
        return {
          lyrics: choice.lyrics,
          librarySongId: choice.librarySongId,
          book: choice.book,
          number: choice.number,
          handEdited,
        };
      }

      if (kind === 'scratch' && title.trim()) {
        const lyrics = lyricsFromScratch(title, words);
        if (!alsoSaveScratch) {
          return { lyrics, book: book || null, number: number || null };
        }
        // Already resolved review → payloads staged; write now.
        if (pendingLibraryPayloads?.length) {
          setBusy(true);
          try {
            const ids = await savePayloads(pendingLibraryPayloads);
            const committed = payloadsToChoices(pendingLibraryPayloads, ids)[0];
            setPendingLibraryPayloads(null);
            return {
              ...committed,
              alsoSavedToLibrary: true,
            };
          } finally {
            setBusy(false);
          }
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
            // null = parent must stay open and not save a stale draft
            return null;
          }
          const payloads = resolveImportSelections(plan, selections);
          if (payloads.length === 0) {
            setAlsoSaveScratch(false);
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
  }

  const openImportPicker = () => fileRef.current?.click();

  const handleImportFile = async (file: File | null) => {
    setError(null);
    setImportPlan(null);
    setImportSelections(null);
    setImportChoices(null);
    setPendingLibraryPayloads(null);
    setChoice(null);
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
      setAlsoSaveImport(true);
      if (!nextPlan.needsReview) {
        // Defer library write until Save slide — stage payloads only.
        const payloads = resolveImportSelections(nextPlan, nextSelections);
        stageImportPayloads(payloads);
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

  const confirmImport = () => {
    if (!importPlan || !importSelections) return;
    setError(null);
    const payloads = resolveImportSelections(importPlan, importSelections);
    if (payloads.length === 0) {
      setError('Nothing to add.');
      return;
    }
    // No library write here — Save slide persists if Also save is checked.
    stageImportPayloads(payloads);
  };

  const confirmScratchSave = () => {
    if (!scratchPlan || !scratchSelections) return;
    const payloads = resolveImportSelections(scratchPlan, scratchSelections);
    if (payloads.length === 0) {
      // Skip / don't save → leave scratch editor, untick Also save (F3).
      setAlsoSaveScratch(false);
      setScratchPlan(null);
      setScratchSelections(null);
      setPendingLibraryPayloads(null);
      setError(null);
      return;
    }
    // Stage only; library write happens on the next Save slide commit.
    setPendingLibraryPayloads(payloads);
    setChoice(payloadsToChoices(payloads)[0]);
    setKind('linked');
    setAlsoSaveImport(true);
    setScratchPlan(null);
    setScratchSelections(null);
    setError(null);
  };

  useEffect(() => {
    // State E: focus Save slide (not the card).
    if (choice) onFocusSaveSlide?.();
  }, [choice, onFocusSaveSlide]);

  const switchToScratch = (opts?: { alsoSave?: boolean; seedTitle?: string }) => {
    setKind('scratch');
    setChoice(null);
    setImportPlan(null);
    setImportChoices(null);
    setPendingLibraryPayloads(null);
    setScratchPlan(null);
    if (opts?.seedTitle) setTitle(opts.seedTitle);
    if (typeof opts?.alsoSave === 'boolean') setAlsoSaveScratch(opts.alsoSave);
  };

  const restoreLibraryWords = () => {
    const lib = libraryWordsRef.current ?? libraryWords;
    if (lib === null || !choice) return;
    setWords(lib);
    const restored = {
      ...choice.lyrics,
      verses: parseVersesText(lib),
    };
    setChoice({ ...choice, lyrics: restored });
    setHandEditUnlocked(false);
  };

  const handleEscapeBack = () => {
    // Existing slide: close panel (confirm if unsaved) — do not walk type-choice levels.
    if (!isPendingNewSlide) {
      onEscapeExistingSlide?.();
      return;
    }
    if (importPlan) {
      setImportPlan(null);
      setImportSelections(null);
      return;
    }
    if (scratchPlan) {
      setAlsoSaveScratch(false);
      setScratchPlan(null);
      setScratchSelections(null);
      return;
    }
    if (choice || importChoices) {
      setChoice(null);
      setImportChoices(null);
      setPendingLibraryPayloads(null);
      setHandEditUnlocked(false);
      return;
    }
    if (kind !== null) {
      // Search Esc (clear query) is handled inside LibrarySongPicker first.
      setKind(null);
      return;
    }
    onCancelNewSlide?.();
  };

  useEffect(() => {
    if (!escapeRef) return;
    escapeRef.current = handleEscapeBack;
    return () => {
      escapeRef.current = null;
    };
  });

  const computeLocalDirty = (): boolean => {
    if (isPendingNewSlide) return false;
    if (kind === 'scratch') {
      const init = initialScratch;
      if (!init) {
        return title.trim().length > 0 || words.trim().length > 0;
      }
      return (
        title !== (init.title ?? '') ||
        book !== (init.book ?? '') ||
        number !== (init.number ?? '') ||
        words !== (init.words ?? '')
      );
    }
    if (kind === 'linked' && choice && initialChoice) {
      if (choice.librarySongId !== initialChoice.librarySongId) return true;
      if (lyricsFingerprint(choice.lyrics) !== lyricsFingerprint(initialChoice.lyrics)) {
        return true;
      }
      if (handEditUnlocked && words !== versesToText(initialChoice.lyrics?.verses)) {
        return true;
      }
      return false;
    }
    // Switched away from the slide's original kind without saving.
    if (initialChoice && kind !== 'linked') return true;
    if (initialScratch && kind !== 'scratch') return true;
    return false;
  };

  if (isDirtyRef) {
    isDirtyRef.current = computeLocalDirty;
  }

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    // Escape is handled at the window level via escapeRef (covers footer focus too).
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      // Search results: LibrarySongPicker handles Ctrl+Enter → card only.
      if (kind === 'linked' && !choice && !importPlan && !importChoices) return;
      if (scratchPlan || importPlan) return;
      if (ready) {
        e.preventDefault();
        e.stopPropagation();
        onRequestSaveSlide?.();
      }
    }
    if (kind === null) {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setTypeFocus('scratch');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setTypeFocus('linked');
      } else if (e.key === '1') {
        e.preventDefault();
        setKind('linked');
      } else if (e.key === '2') {
        e.preventDefault();
        setKind('scratch');
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setKind(typeFocus);
      }
    }
  };

  const showAlsoSaveOnCard =
    Boolean(pendingLibraryPayloads?.length) && Boolean(choice) && !importChoices;
  const showAlsoSaveOnMulti = Boolean(importChoices?.length) && Boolean(pendingLibraryPayloads?.length);

  const existingLinked =
    Boolean(initialChoice?.librarySongId) && kind === 'linked' && Boolean(choice?.librarySongId);
  const effectiveLibraryWords = libraryWordsRef.current ?? libraryWords;
  const wordsDifferFromLibrary =
    existingLinked &&
    libraryWordsReady &&
    effectiveLibraryWords !== null &&
    (handEditUnlocked ? words : versesToText(choice?.lyrics?.verses)) !== effectiveLibraryWords;

  return (
    <div
      className="song-slide-edit-panel"
      data-testid="song-slide-edit-panel"
      onKeyDown={onPanelKeyDown}
    >
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
              ref={typeLinkedRef}
              data-testid="song-type-linked"
              data-focused={typeFocus === 'linked' ? 'true' : 'false'}
              aria-pressed={typeFocus === 'linked'}
              onFocus={() => setTypeFocus('linked')}
              onClick={() => setKind('linked')}
              style={{
                flex: 1,
                minHeight: 72,
                textAlign: 'left',
                padding: 12,
                outline: typeFocus === 'linked' ? '2px solid #06c' : undefined,
              }}
            >
              <strong>Linked song from the library</strong>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                Updates when the library song changes. Press 1
              </div>
            </button>
            <button
              type="button"
              ref={typeScratchRef}
              data-testid="song-type-scratch"
              data-focused={typeFocus === 'scratch' ? 'true' : 'false'}
              aria-pressed={typeFocus === 'scratch'}
              onFocus={() => setTypeFocus('scratch')}
              onClick={() => setKind('scratch')}
              style={{
                flex: 1,
                minHeight: 72,
                textAlign: 'left',
                padding: 12,
                outline: typeFocus === 'scratch' ? '2px solid #06c' : undefined,
              }}
            >
              <strong>Song from scratch</strong>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                Lives only in this deck unless you save it. Press 2
              </div>
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#666' }}>
            Left/Right moves focus; Enter or Space picks. 1 = Linked, 2 = Scratch.
          </p>
        </div>
      ) : (
        <div data-testid="song-type-switch" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            data-testid="song-type-linked"
            aria-pressed={kind === 'linked'}
            className={kind === 'linked' ? 'song-type-tab--active' : undefined}
            onClick={() => {
              setKind('linked');
              setScratchPlan(null);
            }}
            style={
              kind === 'linked'
                ? { fontWeight: 700, borderBottom: '2px solid #06c', background: '#e8f1ff' }
                : undefined
            }
          >
            Linked song
          </button>
          <button
            type="button"
            data-testid="song-type-scratch"
            aria-pressed={kind === 'scratch'}
            className={kind === 'scratch' ? 'song-type-tab--active' : undefined}
            onClick={() => {
              switchToScratch();
            }}
            style={
              kind === 'scratch'
                ? { fontWeight: 700, borderBottom: '2px solid #06c', background: '#e8f1ff' }
                : undefined
            }
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
          <LibrarySongPicker
            onPick={c => {
              setChoice(c);
              setPendingLibraryPayloads(null);
              libraryWordsRef.current = versesToText(c.lyrics.verses);
            }}
            onSwitchToImport={openImportPicker}
            onTypeNewSong={() => switchToScratch({ alsoSave: true })}
          />
          <p>
            <button type="button" data-testid="song-import-file-link" onClick={openImportPicker}>
              Import a song file instead
            </button>
          </p>
        </div>
      ) : null}

      {kind === 'linked' && importPlan && importSelections ? (
        <div data-testid="song-import-review">
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={alsoSaveImport}
              data-testid="song-also-save-import"
              onChange={e => setAlsoSaveImport(e.target.checked)}
            />
            <span>
              Also save to my library
              <div style={{ fontSize: 12, color: '#555' }}>
                When checked, Save slide adds these songs to your library and links the slides.
              </div>
            </span>
          </label>
          <ImportReviewScreen
            plan={importPlan}
            selections={importSelections}
            busy={busy}
            confirmLabel={`Add ${importSelections.checkedKeys.length} song slides`}
            onChange={setImportSelections}
            onConfirm={() => confirmImport()}
          />
        </div>
      ) : null}

      {kind === 'linked' && choice ? (
        <div
          ref={linkedCardRef}
          tabIndex={-1}
          data-testid="song-linked-card"
          data-library-song-id={choice.librarySongId || ''}
          data-pending-library-save={
            pendingLibraryPayloads?.length && alsoSaveImport ? 'true' : 'false'
          }
          style={{ border: '1px solid #4a4', padding: 12, borderRadius: 4 }}
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              onRequestSaveSlide?.();
            }
          }}
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
              {pendingLibraryPayloads?.length && alsoSaveImport ? (
                <span data-testid="song-will-link-on-save" style={{ marginLeft: 8, color: '#060' }}>
                  Will link on Save slide
                </span>
              ) : null}
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
          <p style={{ fontSize: 12, color: '#666' }}>Present: title, then two lines at a time</p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#444' }}>
            {(choice.lyrics.verses?.[0]?.lines ?? []).slice(0, 4).join('\n')}
          </pre>

          {existingLinked && wordsDifferFromLibrary ? (
            <div
              data-testid="song-hand-edit-note"
              style={{
                background: '#fff8c5',
                border: '1px solid #e6c200',
                padding: 8,
                marginTop: 8,
              }}
            >
              <p style={{ margin: 0 }}>
                These words were changed on this slide. Library updates will ask before replacing
                them.
              </p>
              <button
                type="button"
                data-testid="song-use-library-words"
                style={{ marginTop: 6 }}
                onClick={() => restoreLibraryWords()}
              >
                Use library words
              </button>
            </div>
          ) : null}

          {existingLinked && !handEditUnlocked ? (
            <div data-testid="song-state-i-readonly" style={{ marginTop: 8 }}>
              <button
                type="button"
                data-testid="song-edit-words-on-slide"
                onClick={() => {
                  setHandEditUnlocked(true);
                  setWords(versesToText(choice.lyrics.verses));
                }}
              >
                Edit words on this slide
              </button>
            </div>
          ) : null}

          {existingLinked && handEditUnlocked ? (
            <div data-testid="song-state-i-editor" style={{ marginTop: 8 }}>
              <label>
                Words
                <textarea
                  value={words}
                  data-testid="song-hand-edit-words"
                  rows={8}
                  style={{ width: '100%', display: 'block' }}
                  onChange={e => {
                    setWords(e.target.value);
                    const next = lyricsFromScratch(choice.lyrics.title, e.target.value);
                    setChoice({ ...choice, lyrics: { ...next, author: choice.lyrics.author } });
                  }}
                />
              </label>
            </div>
          ) : null}

          {(showAlsoSaveOnCard || showAlsoSaveOnMulti) && (
            <label
              style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}
              data-testid="song-also-save-import-wrap"
            >
              <input
                type="checkbox"
                checked={alsoSaveImport}
                data-testid="song-also-save-import"
                onChange={e => setAlsoSaveImport(e.target.checked)}
              />
              <span>
                Also save to my library
                <div style={{ fontSize: 12, color: '#555' }}>
                  When checked, Save slide adds this song to your library and links the slide.
                </div>
              </span>
            </label>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <button
              type="button"
              data-testid="song-change-song"
              onClick={() => {
                setChoice(null);
                setImportChoices(null);
                setPendingLibraryPayloads(null);
                setHandEditUnlocked(false);
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
                setPendingLibraryPayloads(null);
                setAlsoSaveScratch(false);
                setHandEditUnlocked(false);
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
              Edit in library ↗
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
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={alsoSaveScratch}
                data-testid="song-also-save-scratch"
                onChange={e => setAlsoSaveScratch(e.target.checked)}
              />
              <span>
                Also save to my library
                <div style={{ fontSize: 12, color: '#555' }}>
                  When checked, Save slide adds this song to your library and links the slide.
                </div>
              </span>
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
                onConfirm={() => confirmScratchSave()}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {importChoices && importChoices.length > 1 ? (
        <div data-testid="song-multi-import-ready">
          <p>{importChoices.length} songs ready — Save slide will add them all.</p>
          {showAlsoSaveOnMulti ? (
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={alsoSaveImport}
                data-testid="song-also-save-import"
                onChange={e => setAlsoSaveImport(e.target.checked)}
              />
              <span>
                Also save to my library
                <div style={{ fontSize: 12, color: '#555' }}>
                  When checked, Save slide adds these songs to your library and links the slides.
                </div>
              </span>
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
