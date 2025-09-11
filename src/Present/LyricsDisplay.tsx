import React, { useState, useEffect, useRef } from 'react';
import { SongData, LyricsDisplayState, SlideCSS, LyricsNavigation } from '../Present/PresentTypes';

interface LyricsDisplayProps {
  songData: SongData;
  style: SlideCSS;
  navigationCommand?: LyricsNavigation | null;
  onStateChange?: (state: LyricsDisplayState) => void;
}

export default function LyricsDisplay({
  songData,
  style,
  navigationCommand,
  onStateChange,
}: LyricsDisplayProps) {
  const [state, setState] = useState<LyricsDisplayState>({
    currentVerse: 0,
    currentLineIndex: 0,
    isPlaying: false,
  });
  const lastProcessedTimestamp = useRef<number>(0);

  const currentVerse = songData.verses[state.currentVerse];
  const lines = currentVerse?.lines || [];

  // Get 2 lines to display
  const line1 = lines[state.currentLineIndex] || '';
  const line2 = lines[state.currentLineIndex + 1] || '';

  // Handle external navigation commands
  useEffect(() => {
    if (navigationCommand && navigationCommand.timestamp) {
      // Only process if this is a new command (different timestamp)
      if (navigationCommand.timestamp <= lastProcessedTimestamp.current) {
        return;
      }
      lastProcessedTimestamp.current = navigationCommand.timestamp;
      
      if (navigationCommand.command === 'next') {
        setState(prev => {
          let newState = { ...prev };
          
          const currentVerse = songData.verses[prev.currentVerse];
          const lines = currentVerse?.lines || [];
          const hasMoreLines = prev.currentLineIndex + 2 < lines.length;
          const hasMoreVerses = prev.currentVerse + 1 < songData.verses.length;
          
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
      } else if (navigationCommand.command === 'previous') {
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
      } else if (navigationCommand.command === 'goToVerse') {
        setState(prev => ({
          ...prev,
          currentVerse: navigationCommand.verseIndex,
          currentLineIndex: 0,
        }));
      }
    }
  }, [navigationCommand, songData.verses]);

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
    </div>
  );
}