import React, { useState, useEffect } from 'react';
import { SongData, LyricsDisplayState, SlideCSS } from '../Present/PresentTypes';

interface LyricsDisplayProps {
  songData: SongData;
  style: SlideCSS;
  onStateChange?: (state: LyricsDisplayState) => void;
}

export default function LyricsDisplay({
  songData,
  style,
  onStateChange,
}: LyricsDisplayProps) {
  const [state, setState] = useState<LyricsDisplayState>({
    currentVerse: 0,
    currentLineIndex: 0,
    isPlaying: false,
  });

  const currentVerse = songData.verses[state.currentVerse];
  const lines = currentVerse?.lines || [];

  // Get 2 lines to display
  const line1 = lines[state.currentLineIndex] || '';
  const line2 = lines[state.currentLineIndex + 1] || '';

  const hasMoreLines = state.currentLineIndex + 2 < lines.length;
  const hasMoreVerses = state.currentVerse + 1 < songData.verses.length;

  const nextLines = () => {
    setState(prev => {
      let newState = { ...prev };
      
      if (hasMoreLines) {
        // Move to next 2 lines in current verse
        newState.currentLineIndex = prev.currentLineIndex + 2;
      } else if (hasMoreVerses) {
        // Move to next verse
        newState.currentVerse = prev.currentVerse + 1;
        newState.currentLineIndex = 0;
      }
      
      return newState;
    });
  };

  const previousLines = () => {
    setState(prev => {
      let newState = { ...prev };
      
      if (prev.currentLineIndex > 0) {
        // Move to previous 2 lines in current verse
        newState.currentLineIndex = Math.max(0, prev.currentLineIndex - 2);
      } else if (prev.currentVerse > 0) {
        // Move to previous verse
        newState.currentVerse = prev.currentVerse - 1;
        const prevVerseLines = songData.verses[newState.currentVerse].lines;
        // Find the last pair of lines in the previous verse
        newState.currentLineIndex = Math.max(0, Math.floor((prevVerseLines.length - 1) / 2) * 2);
      }
      
      return newState;
    });
  };

  const goToVerse = (verseIndex: number) => {
    setState(prev => ({
      ...prev,
      currentVerse: verseIndex,
      currentLineIndex: 0,
    }));
  };

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        textAlign: 'center',
        padding: '40px',
      }}
    >
      {/* Song title */}
      <div
        style={{
          fontSize: '2.5em',
          fontWeight: 'bold',
          marginBottom: '30px',
        }}
      >
        {songData.title}
      </div>

      {/* Lyrics lines with extra spacing */}
      <div
        style={{
          fontSize: '2em',
          lineHeight: '2.5',
          marginBottom: '40px',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ marginBottom: '30px' }}>{line1}</div>
        {line2 && <div>{line2}</div>}
      </div>

      {/* Verse indicator */}
      <div
        style={{
          fontSize: '1.2em',
          marginBottom: '20px',
          opacity: 0.7,
        }}
      >
        Verse {currentVerse?.number || state.currentVerse + 1}
      </div>

      {/* Navigation controls */}
      <div
        style={{
          display: 'flex',
          gap: '15px',
          marginTop: '20px',
        }}
      >
        <button
          onClick={previousLines}
          disabled={state.currentVerse === 0 && state.currentLineIndex === 0}
          style={{
            padding: '10px 20px',
            fontSize: '1em',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            opacity: state.currentVerse === 0 && state.currentLineIndex === 0 ? 0.5 : 1,
          }}
        >
          Previous
        </button>
        <button
          onClick={nextLines}
          disabled={!hasMoreLines && !hasMoreVerses}
          style={{
            padding: '10px 20px',
            fontSize: '1em',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            opacity: !hasMoreLines && !hasMoreVerses ? 0.5 : 1,
          }}
        >
          Next
        </button>
      </div>

      {/* Verse selection */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginTop: '15px',
        }}
      >
        {songData.verses.map((verse, index) => (
          <button
            key={index}
            onClick={() => goToVerse(index)}
            style={{
              padding: '5px 15px',
              fontSize: '0.9em',
              backgroundColor: state.currentVerse === index ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            {verse.number}
          </button>
        ))}
      </div>
    </div>
  );
}