import React, { ChangeEvent, useEffect, useState } from 'react';
import { connect, ChannelType, Connection } from '../utils/Broadcast';
import SlideDisplay from '../components/SlideDisplay';
import { PresentData, SlideType, Deck } from '../utils/PresentTypes';
import { parseSongXML, createSongSlide } from '../utils/songParser';

export default function DeckRoute() {
  const [message, setMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [connection, setConnection] = useState<Connection | null | undefined>(null);
  const [isLoadingSong, setIsLoadingSong] = useState<boolean>(false);
  const [isSongMode, setIsSongMode] = useState<boolean>(false);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);

  useEffect(() => {
    setConnection(connect(ChannelType.BUILDER, event => {}));
    setMessage('Deck builder connected');
  }, []);

  useEffect(() => {
    if (connection) {
      connection.channel.postMessage(
        new PresentData({
          slide: null,
          message: message,
          useGreenScreen: false,
        }),
      );
    }
  }, [message]);

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

          const newDeck: Deck = {
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
              },
              [SlideType.SONG]: baseStyle,
            } as any,
            slides: [songSlide],
          };

          setDeck(newDeck);
          setIsSongMode(true);
          setCurrentSongIndex(0);
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
          const json = reader.result as string;
          setDeck(JSON.parse(json) as Deck);
          setIsSongMode(false);
          setMessage('Loaded JSON deck');
        } catch (err) {
          setMessage('Invalid JSON');
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
      const resolvedStyle =
        sl.style || (deck?.slideStyles && deck.slideStyles[sl.type]) || {
          backgroundColor: '#000000',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
        };
      return { ...sl, style: resolvedStyle };
    };
    const slideWithStyle = props.slide ? safeSlide(props.slide) : null;
    connection?.channel.postMessage(new PresentData({ ...props, slide: slideWithStyle }));
  };

  const sendLyricsNavigation = (command: 'next' | 'previous' | 'goToVerse', verseIndex?: number) => {
    const nav = command === 'goToVerse' ? { command, verseIndex } : { command };
    connection?.channel.postMessage(new PresentData({ data: { lyricsNavigation: nav } }));
  };

  const startSong = () => {
    if (!deck || !isSongMode) return;
    setCurrentSongIndex(0);
    const first = deck.slides[0];
    handleSendClick({ slide: first, message: `Song start`, useGreenScreen: deck.useGreenScreen });
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

  return (
    <>
      <h1>Deck (Remix route)</h1>
      <div>
        <input id="file" type="file" onChange={handleFileChange} />
        <button id="load" onClick={() => handleUploadClick()} disabled={isLoadingSong}>{isLoadingSong ? 'Loading...' : 'Load'}</button>
        <button id="save" onClick={handleSaveClick}>Save</button>
        <button onClick={startSong} disabled={!deck || !isSongMode}>Start Song</button>
        <button onClick={rewindSong} disabled={!deck || !isSongMode}>Prev 2 Lines</button>
        <button onClick={advanceSong} disabled={!deck || !isSongMode}>Next 2 Lines</button>
      </div>

      <div>
        <h2>Slides</h2>
        {!deck && <p>No deck loaded yet.</p>}
        <div id="slides">
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {deck?.slides.map((slide: any, index: number) => (
              <li key={slide.id || index} style={{ border: '1px solid #ccc', margin: '4px 0', padding: '6px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <strong>{index + 1}.</strong>
                  <span style={{ flex: 1 }}>{slide.title || slide.type || 'Slide'}</span>
                  <button onClick={() => handleSendClick({ slide, message: `Presenting slide ${index + 1}`, useGreenScreen: deck?.useGreenScreen || false })}>Send</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div id="status" style={{ marginTop: '12px' }}>{message}</div>
    </>
  );
}
