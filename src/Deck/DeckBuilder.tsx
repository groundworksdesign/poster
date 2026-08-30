import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useTheme } from '../utils/useTheme';
import { connect, ChannelType, Connection } from '../Present/Broadcast';
import {
  PresentData,
  Slide,
  SlideType,
  Deck,
  SongData,
  HorizontalAlign,
  VerticalAlign,
} from '../Present/PresentTypes';
import { resolveSlideStyle } from '../utils/resolveSlideStyle';
import { maybeNormalizeStyleColor } from '../utils/normalizeCssColor';
import { buildStagedSongSlide, getSongStageCount } from '../utils/stagedSongSlide';
import { parseSongXML, createSongSlide, isSongData } from '../utils/songParser';
import { validateDeck } from '../utils/deckValidator';
import { CURRENT_SCHEMA_VERSION } from '../utils/schema';
import { remixDataUrl, REMIX_ROUTE_ID } from '../utils/remixDataUrl';

export default function DeckBuilder() {
  useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [connection, setConnection] = useState<Connection | null | undefined>(null);
  const [isLoadingSong, setIsLoadingSong] = useState<boolean>(false);
  const [isSongMode, setIsSongMode] = useState<boolean>(false);
  const [, setCurrentSongIndex] = useState<number>(0);
  const [lastSentSlideId, setLastSentSlideId] = useState<string | null>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);
  const [operatorMessage, setOperatorMessage] = useState<string>('');
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState<number>(0);
  const [showSaveToLibraryPrompt, setShowSaveToLibraryPrompt] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Last stage index sent via Advance/Reverse per song slide id (0 = title, 1+ = lyric pairs). */
  const [songLastStagedById, setSongLastStagedById] = useState<Record<string, number>>({});

  const genId = () => (typeof (globalThis as any).crypto !== 'undefined' && typeof (globalThis as any).crypto.randomUUID === 'function') ? (globalThis as any).crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  const ensureDeckIds = (d: Deck): Deck => {
    return { ...d, slides: d.slides.map(sl => ({ ...sl, id: (sl as any).id ?? genId() })) };
  };

  useEffect(() => {
    setConnection(connect(ChannelType.BUILDER, event => {}));
    setMessage('Deck builder connected');
  }, []);

  // Keyboard shortcut handler ref -- always reflects latest state without stale closures
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>();
  keyHandlerRef.current = (e: KeyboardEvent) => {
    const tag = (document.activeElement as HTMLElement)?.tagName?.toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (isSongMode) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        advanceSong();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        rewindSong();
      }
    } else {
      if (!deck) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        const currentIdx = selectedSlideIndex !== null
          ? selectedSlideIndex
          : deck.slides.findIndex((s: any) => (s as any).id === lastSentSlideId);
        const nextIdx = Math.min((currentIdx < 0 ? -1 : currentIdx) + 1, deck.slides.length - 1);
        if (nextIdx >= 0) {
          handleSendClick({ slide: deck.slides[nextIdx], useGreenScreen: deck.useGreenScreen });
          setSelectedSlideIndex(nextIdx);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        const currentIdx = selectedSlideIndex !== null
          ? selectedSlideIndex
          : deck.slides.findIndex((s: any) => (s as any).id === lastSentSlideId);
        const prevIdx = Math.max((currentIdx <= 0 ? 0 : currentIdx) - 1, 0);
        handleSendClick({ slide: deck.slides[prevIdx], useGreenScreen: deck.useGreenScreen });
        setSelectedSlideIndex(prevIdx);
      }
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current?.(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Previously the builder auto-sent status messages to the presenter when the local `message` state
  // changed. That caused slide-number or status banners to appear on the presentation unexpectedly.
  // Status messages should only be sent explicitly via handleSendClick so normal slide sends don't
  // show a persistent top-banner. Intentionally do not auto-broadcast `message` changes here.
  // (Kept the connection alive via the other effect.)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleUploadClick = () => {
    if (!file) return;
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xml')) {
      setIsLoadingSong(true);
      reader.addEventListener('load', async () => {
        try {
          const xmlContent = reader.result as string;
          const songData = await parseSongXML(xmlContent);

          const baseStyle = {
            backgroundColor: '#000000',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontSize: '28px',
            height: '100%',
            width: '100%',
          };

          const songSlide = createSongSlide(songData, baseStyle);
          (songSlide as any).id = (songSlide as any).id ?? genId();

          const newDeck: Deck = {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            title: `Song: ${songData.title}`,
            date: new Date().toISOString().split('T')[0],
            location: '',
            useGreenScreen: false,
            notes: `Loaded from ${file.name}`,
            slideStyles: {
              [SlideType.GENERAL]: {
                backgroundColor: '#000000',
                color: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                fontSize: '24px',
                horizontalAlign: HorizontalAlign.CENTER,
                verticalAlign: VerticalAlign.MIDDLE,
              },
              [SlideType.SONG]: baseStyle,
            },
            slides: [songSlide],
          };

          setDeck(ensureDeckIds(newDeck));
          setIsSongMode(true);
          setCurrentSongIndex(0);
          setLibraryId(null);
          setShowSaveToLibraryPrompt(true);
          setMessage(`Loaded song: ${songData.title}`);
        } catch (error) {
          setMessage(`Error parsing XML: ${error instanceof Error ? error.message : 'Unknown'}`);
        } finally {
          setIsLoadingSong(false);
        }
      });

      reader.readAsText(file);
    } else if (fileName.endsWith('.json')) {
      reader.addEventListener('load', () => {
        try {
          const parsed = JSON.parse(reader.result as string);

          if (isSongData(parsed)) {
            const baseStyle = {
              backgroundColor: '#000000',
              color: '#ffffff',
              fontFamily: 'Arial, sans-serif',
              fontSize: '28px',
              height: '100%',
              width: '100%',
            };
            const songSlide = createSongSlide(parsed as SongData, baseStyle);
            (songSlide as any).id = (songSlide as any).id ?? genId();
            const newDeck: Deck = {
              schemaVersion: CURRENT_SCHEMA_VERSION,
              title: `Song: ${parsed.title}`,
              date: new Date().toISOString().split('T')[0],
              location: '',
              useGreenScreen: false,
              notes: `Loaded from ${file.name}`,
              slideStyles: {
                [SlideType.GENERAL]: {
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '24px',
                  horizontalAlign: HorizontalAlign.CENTER,
                  verticalAlign: VerticalAlign.MIDDLE,
                },
                [SlideType.SONG]: baseStyle,
              },
              slides: [songSlide],
            };
            setDeck(ensureDeckIds(newDeck));
            setIsSongMode(true);
            setCurrentSongIndex(0);
            setLibraryId(null);
            setShowSaveToLibraryPrompt(true);
            setMessage(`Loaded song: ${parsed.title}`);
          } else {
            const validationError = validateDeck(parsed);
            if (validationError) {
              setMessage(validationError);
            } else {
              // Normalize schemaVersion: default to 1 for files that predate versioning.
              const importedVersion = (parsed as any).schemaVersion ?? 1;
              if (importedVersion > CURRENT_SCHEMA_VERSION) {
                console.warn(
                  `Imported deck has schemaVersion ${importedVersion} which is newer than the current version (${CURRENT_SCHEMA_VERSION}). ` +
                  'Some fields may not be recognized. Consider updating the app.'
                );
              }
              const parsedDeck: Deck = { ...(parsed as Deck), schemaVersion: importedVersion };
              setDeck(ensureDeckIds(parsedDeck));
              setIsSongMode(false);
              // If the imported JSON deck already contains an id, treat it as a library record
              const importedLibraryId = (parsedDeck as any).id ?? null;
              if (importedLibraryId) {
                setLibraryId(importedLibraryId);
                setShowSaveToLibraryPrompt(false);
              } else {
                setLibraryId(null);
                setShowSaveToLibraryPrompt(true);
              }
              setMessage('Loaded JSON deck');
            }
          }
        } catch (err) {
          setMessage('Could not parse file as JSON. Check that the file is valid JSON.');
        }
      });
      reader.readAsText(file);
    } else {
      setMessage('Unsupported file type. Please upload .json or .xml');
    }

    // reset file input
    const fileInput = document.getElementById('file') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
    setFile(null);
  };

  const handleSendClick = (props: any) => {
    const safeSlide = (sl: any) => {
    if (!sl) return sl;
    // ensure slide has an id so we can track it for sync across edits/reorder
    (sl as any).id = (sl as any).id ?? genId();
    const resolvedStyle = resolveSlideStyle(deck, sl);
    return { ...sl, style: resolvedStyle };
  };
    const slideWithStyle = props.slide ? safeSlide(props.slide) : null;
    connection?.channel.postMessage(new PresentData({ ...props, slide: slideWithStyle }));
    setLastSentSlideId(slideWithStyle?.id ?? null);
  };

  const handleSongStageAdvance = (slideRef: any) => {
    if (!deck) return;
    const full = (
      slideRef.id
        ? deck.slides.find((s: any) => (s as any).id === slideRef.id)
        : deck.slides.find(s => s === slideRef)
    ) as Slide | undefined;
    if (!full || full.type !== SlideType.SONG || !full.lyrics) return;
    const id = (full as any).id as string | undefined;
    if (!id) return;
    const total = getSongStageCount(full);
    const last = songLastStagedById[id];
    const nextStage = last === undefined ? 0 : (last + 1) % total;
    const staged = buildStagedSongSlide(full, nextStage);
    handleSendClick({ slide: staged, useGreenScreen: deck.useGreenScreen });
    setSongLastStagedById(s => ({ ...s, [id]: nextStage }));
  };

  const handleSongStageReverse = (slideRef: any) => {
    if (!deck) return;
    const full = (
      slideRef.id
        ? deck.slides.find((s: any) => (s as any).id === slideRef.id)
        : deck.slides.find(s => s === slideRef)
    ) as Slide | undefined;
    if (!full || full.type !== SlideType.SONG || !full.lyrics) return;
    const id = (full as any).id as string | undefined;
    if (!id) return;
    const last = songLastStagedById[id];
    if (last === undefined || last === 0) return;
    const prevStage = last - 1;
    const staged = buildStagedSongSlide(full, prevStage);
    handleSendClick({ slide: staged, useGreenScreen: deck.useGreenScreen });
    setSongLastStagedById(s => ({ ...s, [id]: prevStage }));
  };

  /** Jump to title/subtitle stage (stage 0) in one step. */
  const handleSongFullRewind = (slideRef: any) => {
    if (!deck) return;
    const full = (
      slideRef.id
        ? deck.slides.find((s: any) => (s as any).id === slideRef.id)
        : deck.slides.find(s => s === slideRef)
    ) as Slide | undefined;
    if (!full || full.type !== SlideType.SONG || !full.lyrics) return;
    const id = (full as any).id as string | undefined;
    if (!id) return;
    const staged = buildStagedSongSlide(full, 0);
    handleSendClick({ slide: staged, useGreenScreen: deck.useGreenScreen });
    setSongLastStagedById(s => ({ ...s, [id]: 0 }));
  };

  const sendLyricsNavigation = (command: 'next' | 'previous' | 'goToVerse', verseIndex?: number) => {
    const nav = command === 'goToVerse' ? { command, verseIndex } : { command };
    connection?.channel.postMessage(new PresentData({ data: { lyricsNavigation: nav } }));
  };

  const startSong = () => {
    if (!deck || !isSongMode) return;
    setCurrentSongIndex(0);
    const first = deck.slides[0] as Slide;
    const id = (first as any).id as string | undefined;
    if (first.type === SlideType.SONG && first.lyrics && id) {
      const staged = buildStagedSongSlide(first, 0);
      handleSendClick({ slide: staged, message: `Song start`, useGreenScreen: deck.useGreenScreen });
      setSongLastStagedById(s => ({ ...s, [id]: 0 }));
    } else {
      handleSendClick({ slide: first, message: `Song start`, useGreenScreen: deck.useGreenScreen });
    }
  };

  const advanceSong = () => {
    if (!deck || !isSongMode) return;
    setCurrentSongIndex(prev => {
      const next = prev + 1;
      // send navigation command (Presentation will handle segment index)
      sendLyricsNavigation('next');
      return next;
    });
  };

  const rewindSong = () => {
    if (!deck || !isSongMode) return;
    setCurrentSongIndex(prev => {
      const next = Math.max(0, prev - 1);
      sendLyricsNavigation('previous');
      return next;
    });
  };

  const syncSentSlideIfNeeded = (newDeck: Deck | null) => {
    if (!newDeck || !lastSentSlideId) return;
    const found = newDeck.slides.find((s: any) => (s as any).id === lastSentSlideId);
    if (found && found.type === SlideType.SONG) return;
    if (found) {
      // re-send updated slide to presenter so presentation stays in sync (no status banner)
      handleSendClick({ slide: found, useGreenScreen: newDeck.useGreenScreen });
    }
  };

  // Deck defaults helpers
  const updateDeckDefaultStyle = (key: keyof any, value: any) => {
    if (!deck) return;
    const normalized =
      typeof value === 'string' ? maybeNormalizeStyleColor(String(key), value) : value;
    const newSlideStyles = { ...(deck.slideStyles || {}) } as Record<string, any>;
    const general = newSlideStyles[SlideType.GENERAL] || {};
    newSlideStyles[SlideType.GENERAL] = { ...general, [key]: normalized };
    const newDeck = { ...deck, slideStyles: newSlideStyles };
    setDeck(newDeck);
    syncSentSlideIfNeeded(newDeck);
  };

  const resetDeckGeneralDefaults = () => {
    if (!deck) return;
    const newSlideStyles = { ...(deck.slideStyles || {}) } as Record<string, any>;
    delete newSlideStyles[SlideType.GENERAL];
    const newDeck = { ...deck, slideStyles: newSlideStyles };
    setDeck(newDeck);
    syncSentSlideIfNeeded(newDeck);
  };

  const updateSlideField = (index: number, field: string, value: any) => {
    if (!deck) return;
    const slides = deck.slides.slice();
    const slide = { ...slides[index] } as any;
    const slideId = slide.id as string | undefined;
    (slide as any)[field] = value;
    slides[index] = slide;
    const newDeck = { ...deck, slides };
    setDeck(newDeck);
    if (field === 'lyrics' && slideId) {
      setSongLastStagedById(s => {
        const next = { ...s };
        delete next[slideId];
        return next;
      });
    }
    syncSentSlideIfNeeded(newDeck);
  };

  const updateSlideStyle = (index: number, key: keyof any, value: any) => {
    if (!deck) return;
    const slides = deck.slides.slice();
    const slide = { ...slides[index] } as any;
    const style = { ...(slide.style || {}) } as any;
    if (value === '' || value === null || value === undefined) {
      delete style[key as string];
    } else {
      const stored =
        typeof value === 'string' ? maybeNormalizeStyleColor(String(key), value) : value;
      style[key as string] = stored;
    }
    slide.style = style;
    slides[index] = slide;
    const newDeck = { ...deck, slides };
    setDeck(newDeck);
    syncSentSlideIfNeeded(newDeck);
  };

  const resetSlideStyleField = (index: number, key: keyof any) => {
    if (!deck) return;
    const slides = deck.slides.slice();
    const slide = { ...slides[index] } as any;
    const style = { ...(slide.style || {}) } as any;
    delete style[key as string];
    slide.style = style;
    slides[index] = slide;
    const newDeck = { ...deck, slides };
    setDeck(newDeck);
    syncSentSlideIfNeeded(newDeck);
  };

  const resetAllSlideStyleOverrides = (index: number) => {
    if (!deck) return;
    const slides = deck.slides.slice();
    const slide = { ...slides[index] } as any;
    slide.style = {};
    slides[index] = slide;
    const newDeck = { ...deck, slides };
    setDeck(newDeck);
    syncSentSlideIfNeeded(newDeck);
  };

  const createNewDeck = () => {
    const newDeck: Deck = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      title: 'New Deck',
      date: new Date().toISOString().split('T')[0],
      location: '',
      useGreenScreen: false,
      notes: '',
      slideStyles: {
        [SlideType.GENERAL]: {
          backgroundColor: '#000000',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          horizontalAlign: HorizontalAlign.CENTER,
          verticalAlign: VerticalAlign.MIDDLE,
        },
      },
      slides: [
        {
          type: SlideType.TITLE,
          title: 'Title',
          subTitle: '',
          style: {},
          titleFontSize: '48px',
          subTitleFontSize: '28px',
          id: genId(),
        },
      ],
    };
    setDeck(ensureDeckIds(newDeck));
    setSelectedSlideIndex(0);
    setLibraryId(null);
    setShowSaveToLibraryPrompt(false);
    setSongLastStagedById({});
    setMessage('New deck created');
  };

  const addSlide = (type: SlideType = SlideType.GENERAL) => {
    if (!deck) {
      createNewDeck();
      return;
    }
    const slides = deck.slides.slice();
    const newSlide: any = {
      type,
      title: type === SlideType.TITLE ? 'Title' : 'Slide',
      subTitle: '',
      style: {},
      id: genId(),
    };
    if (type === SlideType.SONG) {
      newSlide.lyrics = { title: 'Song', author: '', verses: [{ number: 1, lines: [''] }] };
    }
    slides.push(newSlide);
    const newDeck = { ...deck, slides };
    setDeck(newDeck);
    setSelectedSlideIndex(slides.length - 1);
    syncSentSlideIfNeeded(newDeck);
  };

  const duplicateSlide = (index: number) => {
    if (!deck) return;
    const slides = deck.slides.slice();
    const s = { ...(slides[index] as any) };
    s.id = genId();
    slides.splice(index + 1, 0, s);
    const newDeck = { ...deck, slides };
    setDeck(newDeck);
    setSelectedSlideIndex(index + 1);
    syncSentSlideIfNeeded(newDeck);
  };

  const deleteSlide = (index: number) => {
    if (!deck) return;
    const slides = deck.slides.slice();
    slides.splice(index, 1);
    const newDeck = { ...deck, slides };
    setDeck(newDeck);
    setSelectedSlideIndex(null);
    syncSentSlideIfNeeded(newDeck);
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    if (!deck) return;
    const slides = deck.slides.slice();
    const to = direction === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= slides.length) return;
    [slides[index], slides[to]] = [slides[to], slides[index]];
    const newDeck = { ...deck, slides };
    setDeck(newDeck);
    syncSentSlideIfNeeded(newDeck);
  };

  const handleSaveClick = () => {
    if (!deck) {
      setMessage('No deck to save');
      return;
    }
    const blob = new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.title || 'deck'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage('Deck downloaded');
  };

  const handleSaveToLibrary = async () => {
    if (!deck) {
      setMessage('No deck to save');
      return;
    }
    try {
      const wasUpdate = !!libraryId;
      const body = libraryId ? { ...deck, id: libraryId } : deck;
      const res = await fetch(remixDataUrl('/library/save', REMIX_ROUTE_ID.librarySave), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(`Library save failed: ${(err as any).error || res.status}`);
        return;
      }
      const data = await res.json();
      setLibraryId(data.id);
      setMessage(wasUpdate ? 'Library updated.' : 'Saved to library.');
      setLibraryRefreshKey(k => k + 1);
    } catch (e) {
      setMessage(`Library save error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
  };

  const openFromLibrary = async (id: string) => {
    try {
      const res = await fetch(remixDataUrl(`/library/open/${id}`, REMIX_ROUTE_ID.libraryOpen));
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(`Open failed: ${(err as any).error || res.status}`);
        return;
      }
      const loadedDeck = await res.json();
      // Normalize schemaVersion for records saved before versioning was introduced.
      const openedVersion = loadedDeck.schemaVersion ?? 1;
      if (openedVersion > CURRENT_SCHEMA_VERSION) {
        console.warn(
          `Library deck has schemaVersion ${openedVersion} which is newer than the current version (${CURRENT_SCHEMA_VERSION}). ` +
          'Some fields may not be recognized. Consider updating the app.'
        );
      }
      const normalizedDeck: Deck = { ...loadedDeck, schemaVersion: openedVersion };
      setDeck(ensureDeckIds(normalizedDeck));
      setLibraryId(id);
      setIsSongMode(false);
      setCurrentSongIndex(0);
      setSelectedSlideIndex(null);
      setLastSentSlideId(null);
      setSongLastStagedById({});
      setShowSaveToLibraryPrompt(false);
      setMessage('Opened from library.');
    } catch (e) {
      setMessage(`Open error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
  };

  // On mount: handle ?open=<id> (open a library record) and ?focusImport=1 (trigger file picker).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openId = params.get('open');
    const focusImport = params.get('focusImport');
    if (openId) {
      const stripped = new URLSearchParams(params);
      stripped.delete('open');
      const newSearch = stripped.toString();
      window.history.replaceState(null, '', window.location.pathname + (newSearch ? '?' + newSearch : ''));
      openFromLibrary(openId);
    }
    if (focusImport) {
      const stripped = new URLSearchParams(params);
      stripped.delete('focusImport');
      const newSearch = stripped.toString();
      window.history.replaceState(null, '', window.location.pathname + (newSearch ? '?' + newSearch : ''));
      // Trigger file picker after a short delay so the component is fully mounted
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="deck-page">
      <nav className="deck-page-nav">
        <a href="/" className="deck-page-home-link">← Home</a>
      </nav>
      <h1>Deck</h1>
      <div>
        <input ref={fileInputRef} id="file" type="file" onChange={handleFileChange} />
        <button id="load" onClick={() => handleUploadClick()} disabled={isLoadingSong}>{isLoadingSong ? 'Loading...' : 'Load'}</button>
        <button id="save" onClick={handleSaveClick}>Save</button>
        <button id="save-to-library" onClick={handleSaveToLibrary} disabled={!deck}>Save to Library</button>
        <button onClick={createNewDeck}>New Deck</button>
        <label style={{ marginLeft: '8px' }}>
          Add slide:
          <select id="add-slide-type" onChange={e => { /* handled on click */ }} defaultValue={SlideType.GENERAL}>
            <option value={SlideType.GENERAL}>GENERAL</option>
            <option value={SlideType.TITLE}>TITLE</option>
            <option value={SlideType.IMAGE}>IMAGE</option>
            <option value={SlideType.SONG}>SONG</option>
          </select>
        </label>
        <button onClick={() => {
          const sel = (document.getElementById('add-slide-type') as HTMLSelectElement | null);
          const t = sel ? (sel.value as SlideType) : SlideType.GENERAL;
          addSlide(t);
        }} style={{ marginLeft: '8px' }}>Add Slide</button>
        <button onClick={startSong} disabled={!deck || !isSongMode}>Start Song</button>
        <button onClick={rewindSong} disabled={!deck || !isSongMode}>Prev 2 Lines</button>
        <button onClick={advanceSong} disabled={!deck || !isSongMode}>Next 2 Lines</button>

        {deck && (
          <div style={{ marginTop: '12px', padding: '8px', border: '1px solid #ddd' }}>
            <h3>Deck metadata</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label>Title: <input type="text" value={deck.title || ''} onChange={e => setDeck({ ...deck, title: e.target.value })} /></label>
              <label>Date: <input type="date" value={deck.date || ''} onChange={e => setDeck({ ...deck, date: e.target.value })} /></label>
              <label>Location: <input type="text" value={deck.location || ''} onChange={e => setDeck({ ...deck, location: e.target.value })} /></label>
              <label>Notes: <textarea className="deck-field-wide" value={deck.notes || ''} onChange={e => setDeck({ ...deck, notes: e.target.value })} style={{ verticalAlign: 'top', height: '60px' }} /></label>
              <label><input type="checkbox" checked={!!deck.useGreenScreen} onChange={e => { const updated = { ...deck, useGreenScreen: e.target.checked }; setDeck(updated); syncSentSlideIfNeeded(updated); }} /> Green screen</label>
            </div>
          </div>
        )}

        <div style={{ marginTop: '12px', padding: '8px', border: '1px solid #ddd' }}>
          <h3>Send message</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Type message to send..."
              value={operatorMessage}
              onChange={e => setOperatorMessage(e.target.value)}
              disabled={!deck}
              className="deck-field-message"
            />
            <button
              disabled={!deck || operatorMessage.trim() === ''}
              onClick={() => {
                handleSendClick({ message: operatorMessage, useGreenScreen: deck?.useGreenScreen || false });
                setOperatorMessage('');
              }}
            >Send Message</button>
            <button
              disabled={!deck}
              onClick={() => handleSendClick({ message: '', useGreenScreen: deck?.useGreenScreen || false })}
            >Clear</button>
          </div>
        </div>

        <div style={{ marginTop: '12px', padding: '8px', border: '1px solid #ddd' }}>
          <h3>Deck defaults (GENERAL)</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label>Background: <input type="text" value={deck?.slideStyles?.[SlideType.GENERAL]?.backgroundColor || ''} onChange={e => updateDeckDefaultStyle('backgroundColor', e.target.value)} /></label>
            <label>Color: <input type="text" value={deck?.slideStyles?.[SlideType.GENERAL]?.color || ''} onChange={e => updateDeckDefaultStyle('color', e.target.value)} /></label>
            <label>Font: <input type="text" value={deck?.slideStyles?.[SlideType.GENERAL]?.fontFamily || ''} onChange={e => updateDeckDefaultStyle('fontFamily', e.target.value)} /></label>
            <label>Font size: <input type="text" value={deck?.slideStyles?.[SlideType.GENERAL]?.fontSize || ''} onChange={e => updateDeckDefaultStyle('fontSize', e.target.value)} /></label>
            {deck && (() => {
              const g = deck.slideStyles?.[SlideType.GENERAL] || {};
              const rawH = g.horizontalAlign ?? HorizontalAlign.CENTER;
              const deckSelectH =
                rawH === HorizontalAlign.LEFT || rawH === HorizontalAlign.CENTER || rawH === HorizontalAlign.RIGHT
                  ? rawH
                  : HorizontalAlign.CENTER;
              const rawV = g.verticalAlign ?? VerticalAlign.MIDDLE;
              const deckSelectV =
                rawV === VerticalAlign.TOP || rawV === VerticalAlign.MIDDLE || rawV === VerticalAlign.BOTTOM
                  ? rawV
                  : VerticalAlign.MIDDLE;
              return (
                <>
                  <label>
                    Horizontal alignment:{' '}
                    <select
                      value={deckSelectH}
                      onChange={e => updateDeckDefaultStyle('horizontalAlign', e.target.value as HorizontalAlign)}
                    >
                      <option value={HorizontalAlign.LEFT}>Left</option>
                      <option value={HorizontalAlign.CENTER}>Center</option>
                      <option value={HorizontalAlign.RIGHT}>Right</option>
                    </select>
                  </label>
                  <label>
                    Vertical alignment:{' '}
                    <select
                      value={deckSelectV}
                      onChange={e => updateDeckDefaultStyle('verticalAlign', e.target.value as VerticalAlign)}
                    >
                      <option value={VerticalAlign.TOP}>Top</option>
                      <option value={VerticalAlign.MIDDLE}>Middle</option>
                      <option value={VerticalAlign.BOTTOM}>Bottom</option>
                    </select>
                  </label>
                </>
              );
            })()}
            <button onClick={() => resetDeckGeneralDefaults()}>Clear GENERAL defaults</button>
          </div>
        </div>
      </div>

      <div>
        <h2>Slides</h2>
        {!deck && <p>No deck loaded yet.</p>}
        <div id="slides">
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {deck?.slides.map((slide: any, index: number) => (
              <li key={(slide as any).id || index} style={{ border: '1px solid #ccc', margin: '4px 0', padding: '6px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <strong>{index + 1}.</strong>
                  <span style={{ flex: 1 }}>{slide.title || slide.type || 'Slide'}</span>
                  <button
                    onClick={() => {
                      const sid = (slide as any).id as string | undefined;
                      if (slide.type === SlideType.SONG && slide.lyrics && sid && deck) {
                        const full = deck.slides.find((s: any) => s.id === sid) as Slide;
                        const staged = buildStagedSongSlide(full, 0);
                        handleSendClick({ slide: staged, useGreenScreen: deck.useGreenScreen });
                        setSongLastStagedById(st => ({ ...st, [sid]: 0 }));
                      } else {
                        handleSendClick({ slide, useGreenScreen: deck?.useGreenScreen || false });
                      }
                    }}
                  >
                    Send
                  </button>
                  {slide.type === SlideType.SONG && slide.lyrics && (slide as any).id ? (
                    <>
                      <button
                        type="button"
                        title="Full rewind to title"
                        onClick={() => handleSongFullRewind(slide)}
                      >
                        |&lt;--
                      </button>
                      <button
                        type="button"
                        disabled={
                          songLastStagedById[(slide as any).id] === undefined ||
                          songLastStagedById[(slide as any).id] === 0
                        }
                        onClick={() => handleSongStageReverse(slide)}
                      >
                        Reverse
                      </button>
                      <button type="button" onClick={() => handleSongStageAdvance(slide)}>Advance</button>
                    </>
                  ) : null}
                  <button onClick={() => setSelectedSlideIndex(index)}>Edit</button>
                  <button onClick={() => duplicateSlide(index)}>Duplicate</button>
                  <button onClick={() => deleteSlide(index)}>Delete</button>
                  <button onClick={() => moveSlide(index, 'up')} disabled={index === 0}>↑</button>
                  <button onClick={() => moveSlide(index, 'down')} disabled={index === (deck!.slides.length - 1)}>↓</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {typeof selectedSlideIndex === 'number' && deck && deck.slides[selectedSlideIndex] && (
        <div style={{ marginTop: '12px', padding: '8px', border: '1px solid #ddd' }}>
          <h3>Editing slide {selectedSlideIndex + 1}</h3>
          {(() => {
            const slide = deck.slides[selectedSlideIndex] as any;
            return (
              <div>
                <div>
                  <label>Type: 
                    <select value={slide.type} onChange={e => updateSlideField(selectedSlideIndex, 'type', e.target.value as SlideType)}>
                      <option value={SlideType.GENERAL}>GENERAL</option>
                      <option value={SlideType.TITLE}>TITLE</option>
                      <option value={SlideType.IMAGE}>IMAGE</option>
                      <option value={SlideType.SONG}>SONG</option>
                    </select>
                  </label>
                </div>
                <div>
                  <label>Title: <input type="text" value={slide.title || ''} onChange={e => updateSlideField(selectedSlideIndex, 'title', e.target.value)} /></label>
                </div>
                <div>
                  <label>Subtitle: <input type="text" value={slide.subTitle || ''} onChange={e => updateSlideField(selectedSlideIndex, 'subTitle', e.target.value)} /></label>
                </div>

                {slide.type === SlideType.IMAGE && (
                  <div>
                    <label>Image URL/file: <input type="text" value={slide.file || slide.style?.backgroundImage || ''} onChange={e => updateSlideField(selectedSlideIndex, 'file', e.target.value)} /></label>
                  </div>
                )}

                {slide.type === SlideType.SONG && (
                  <div>
                    <label>Lyrics (JSON):</label>
                    <div>
                      <textarea id="lyrics-json" style={{ width: '100%', height: '120px' }} defaultValue={slide.lyrics ? JSON.stringify(slide.lyrics, null, 2) : ''}></textarea>
                      <div style={{ marginTop: '6px' }}>
                        <button onClick={() => {
                          const t = (document.getElementById('lyrics-json') as HTMLTextAreaElement | null);
                          if (!t) return;
                          try {
                            const parsed = JSON.parse(t.value) as SongData;
                            updateSlideField(selectedSlideIndex, 'lyrics', parsed);
                          } catch (err) {
                            setMessage('Invalid Lyrics JSON');
                          }
                        }}>Apply Lyrics JSON</button>
                        <button onClick={() => {
                          // quick add an empty verse
                          const s = { ...(deck.slides[selectedSlideIndex] as any) };
                          const lyrics = s.lyrics || { title: '', author: '', verses: [] };
                          lyrics.verses = lyrics.verses.concat([{ number: (lyrics.verses.length || 0) + 1, lines: [''] }]);
                          updateSlideField(selectedSlideIndex, 'lyrics', lyrics);
                        }} style={{ marginLeft: '8px' }}>Add Verse</button>
                      </div>
                    </div>
                  </div>
                )}

                <h4>Style (effective shown; overrides saved to slide.style)</h4>
                {(() => {
                  const effective = resolveSlideStyle(deck, slide);
                  const textStyleKeys: Array<'backgroundColor' | 'color' | 'fontFamily' | 'fontSize'> = [
                    'backgroundColor',
                    'color',
                    'fontFamily',
                    'fontSize',
                  ];
                  const rawH = slide.style?.horizontalAlign ?? effective.horizontalAlign ?? HorizontalAlign.CENTER;
                  const selectHorizontal =
                    rawH === HorizontalAlign.LEFT || rawH === HorizontalAlign.CENTER || rawH === HorizontalAlign.RIGHT
                      ? rawH
                      : HorizontalAlign.CENTER;
                  const rawV = slide.style?.verticalAlign ?? effective.verticalAlign ?? VerticalAlign.MIDDLE;
                  const selectVertical =
                    rawV === VerticalAlign.TOP || rawV === VerticalAlign.MIDDLE || rawV === VerticalAlign.BOTTOM
                      ? rawV
                      : VerticalAlign.MIDDLE;
                  return (
                    <div>
                      {textStyleKeys.map((k) => (
                        <div key={k} style={{ marginTop: '6px' }}>
                          <label style={{ marginRight: '8px' }}>{`${k}: `}</label>
                          <input
                            type="text"
                            value={(slide.style && slide.style[k]) || (effective as any)[k] || ''}
                            onChange={e => updateSlideStyle(selectedSlideIndex, k, e.target.value)}
                          />
                          <button type="button" onClick={() => resetSlideStyleField(selectedSlideIndex, k)} style={{ marginLeft: '8px' }}>Reset</button>
                        </div>
                      ))}
                      <div style={{ marginTop: '6px' }}>
                        <label style={{ marginRight: '8px' }}>Horizontal alignment: </label>
                        <select
                          value={selectHorizontal}
                          onChange={e => updateSlideStyle(selectedSlideIndex, 'horizontalAlign', e.target.value)}
                        >
                          <option value={HorizontalAlign.LEFT}>Left</option>
                          <option value={HorizontalAlign.CENTER}>Center</option>
                          <option value={HorizontalAlign.RIGHT}>Right</option>
                        </select>
                        <button type="button" onClick={() => resetSlideStyleField(selectedSlideIndex, 'horizontalAlign')} style={{ marginLeft: '8px' }}>Reset</button>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <label style={{ marginRight: '8px' }}>Vertical alignment: </label>
                        <select
                          value={selectVertical}
                          onChange={e => updateSlideStyle(selectedSlideIndex, 'verticalAlign', e.target.value)}
                        >
                          <option value={VerticalAlign.TOP}>Top</option>
                          <option value={VerticalAlign.MIDDLE}>Middle</option>
                          <option value={VerticalAlign.BOTTOM}>Bottom</option>
                        </select>
                        <button type="button" onClick={() => resetSlideStyleField(selectedSlideIndex, 'verticalAlign')} style={{ marginLeft: '8px' }}>Reset</button>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        {slide.type === SlideType.SONG && slide.lyrics && slide.id ? (
                          <>
                            <button
                              type="button"
                              title="Full rewind to title"
                              onClick={() => handleSongFullRewind(slide)}
                              style={{ marginRight: '8px' }}
                            >
                              |&lt;-- Full rewind
                            </button>
                            <button
                              type="button"
                              disabled={
                                songLastStagedById[slide.id] === undefined ||
                                songLastStagedById[slide.id] === 0
                              }
                              onClick={() => handleSongStageReverse(slide)}
                              style={{ marginRight: '8px' }}
                            >
                              Reverse (staged)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSongStageAdvance(slide)}
                              style={{ marginRight: '8px' }}
                            >
                              Advance (staged)
                            </button>
                          </>
                        ) : null}
                        <button onClick={() => resetAllSlideStyleOverrides(selectedSlideIndex)}>Reset all overrides</button>
                        <button onClick={() => duplicateSlide(selectedSlideIndex)} style={{ marginLeft: '8px' }}>Duplicate</button>
                        <button onClick={() => deleteSlide(selectedSlideIndex)} style={{ marginLeft: '8px' }}>Delete</button>
                        <button onClick={() => setSelectedSlideIndex(null)} style={{ marginLeft: '8px' }}>Close editor</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}

      <div id="status" style={{ marginTop: '12px' }}>{message}</div>
      {showSaveToLibraryPrompt && (
        <div data-testid="import-save-prompt" style={{ marginTop: '8px', padding: '8px', border: '1px solid #aaa', display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
          <span>Save this import to the library?</span>
          <button id="import-save-to-library" onClick={async () => { setShowSaveToLibraryPrompt(false); await handleSaveToLibrary(); }}>Save to Library</button>
          <button id="import-skip-save-to-library" onClick={() => setShowSaveToLibraryPrompt(false)}>Skip</button>
        </div>
      )}
      {libraryId && <div data-testid="library-id" style={{ fontSize: '11px', color: '#888' }}>Library ID: {libraryId}</div>}
      {/* Library panel moved to HomePage — DeckBuilder keeps Save/Load controls on /deck */}
    </main>
  );
}
