import React from 'react';
import { render, screen } from '@testing-library/react';
import LyricsDisplay from '../Present/LyricsDisplay';
import { SongData } from '../Present/PresentTypes';

describe('LyricsDisplay', () => {
  const mockSongData: SongData = {
    title: 'Test Song',
    author: 'Test Author',
    verses: [
      {
        number: 1,
        lines: [
          'Line 1 of verse 1',
          'Line 2 of verse 1',
          'Line 3 of verse 1',
          'Line 4 of verse 1',
        ],
      },
      {
        number: 2,
        lines: [
          'Line 1 of verse 2',
          'Line 2 of verse 2',
        ],
      },
    ],
  };

  const mockStyle = {
    backgroundColor: '#000000',
    color: '#ffffff',
    fontFamily: 'Arial',
    fontSize: '24px',
  };

  test('should display song title', () => {
    render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    expect(screen.getByText('Test Song')).toBeInTheDocument();
  });

  test('should display exactly 2 lines at a time initially', () => {
    render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    expect(screen.getByText('Line 1 of verse 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2 of verse 1')).toBeInTheDocument();
    expect(screen.queryByText('Line 3 of verse 1')).not.toBeInTheDocument();
  });

  test('should show current verse indicator', () => {
    render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    expect(screen.getByText('Verse 1')).toBeInTheDocument();
  });

  test('should navigate to next 2 lines when receiving next command', () => {
    const { rerender } = render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    // Initially shows first 2 lines
    expect(screen.getByText('Line 1 of verse 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2 of verse 1')).toBeInTheDocument();
    
    // Send next command
    rerender(
      <LyricsDisplay 
        songData={mockSongData} 
        style={mockStyle} 
        navigationCommand={{ command: 'next', timestamp: Date.now() }} 
      />
    );
    
    expect(screen.getByText('Line 3 of verse 1')).toBeInTheDocument();
    expect(screen.getByText('Line 4 of verse 1')).toBeInTheDocument();
    expect(screen.queryByText('Line 1 of verse 1')).not.toBeInTheDocument();
  });

  test('should navigate to next verse when receiving next command after last lines', async () => {
    const { rerender } = render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    // Move to lines 3-4 of verse 1
    rerender(
      <LyricsDisplay 
        songData={mockSongData} 
        style={mockStyle} 
        navigationCommand={{ command: 'next', timestamp: Date.now() }} 
      />
    );
    
    // Move to verse 2 - use different timestamp
    rerender(
      <LyricsDisplay 
        songData={mockSongData} 
        style={mockStyle} 
        navigationCommand={{ command: 'next', timestamp: Date.now() + 1 }} 
      />
    );
    
    expect(screen.getByText('Line 1 of verse 2')).toBeInTheDocument();
    expect(screen.getByText('Line 2 of verse 2')).toBeInTheDocument();
    expect(screen.getByText('Verse 2')).toBeInTheDocument();
  });

  test('should navigate backwards when receiving previous command', () => {
    const { rerender } = render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    // Move forward first
    rerender(
      <LyricsDisplay 
        songData={mockSongData} 
        style={mockStyle} 
        navigationCommand={{ command: 'next', timestamp: Date.now() }} 
      />
    );
    
    expect(screen.getByText('Line 3 of verse 1')).toBeInTheDocument();
    
    // Move back
    rerender(
      <LyricsDisplay 
        songData={mockSongData} 
        style={mockStyle} 
        navigationCommand={{ command: 'previous', timestamp: Date.now() + 1 }} 
      />
    );
    
    expect(screen.getByText('Line 1 of verse 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2 of verse 1')).toBeInTheDocument();
  });

  test('should navigate to specific verse when receiving goToVerse command', () => {
    const { rerender } = render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    // Go to verse 2
    rerender(
      <LyricsDisplay 
        songData={mockSongData} 
        style={mockStyle} 
        navigationCommand={{ command: 'goToVerse', verseIndex: 1, timestamp: Date.now() }} 
      />
    );
    
    expect(screen.getByText('Line 1 of verse 2')).toBeInTheDocument();
    expect(screen.getByText('Line 2 of verse 2')).toBeInTheDocument();
    expect(screen.getByText('Verse 2')).toBeInTheDocument();
  });

  test('should call onStateChange when navigation occurs', () => {
    const mockOnStateChange = jest.fn();
    const { rerender } = render(
      <LyricsDisplay 
        songData={mockSongData} 
        style={mockStyle} 
        onStateChange={mockOnStateChange}
      />
    );
    
    // Initial render should call onStateChange
    expect(mockOnStateChange).toHaveBeenCalledWith({
      currentVerse: 0,
      currentLineIndex: 0,
      isPlaying: false,
    });
    
    // Navigate and check state change
    rerender(
      <LyricsDisplay 
        songData={mockSongData} 
        style={mockStyle} 
        navigationCommand={{ command: 'next', timestamp: Date.now() }}
        onStateChange={mockOnStateChange}
      />
    );
    
    expect(mockOnStateChange).toHaveBeenCalledWith({
      currentVerse: 0,
      currentLineIndex: 2,
      isPlaying: false,
    });
  });
});