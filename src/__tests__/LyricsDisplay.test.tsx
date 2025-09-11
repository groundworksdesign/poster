import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  test('should navigate to next 2 lines when Next button is clicked', () => {
    render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(screen.getByText('Line 3 of verse 1')).toBeInTheDocument();
    expect(screen.getByText('Line 4 of verse 1')).toBeInTheDocument();
    expect(screen.queryByText('Line 1 of verse 1')).not.toBeInTheDocument();
  });

  test('should navigate to next verse when all lines of current verse are shown', () => {
    render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    const nextButton = screen.getByText('Next');
    
    // Click Next to show lines 3-4 of verse 1
    fireEvent.click(nextButton);
    
    // Click Next again to move to verse 2
    fireEvent.click(nextButton);
    
    expect(screen.getByText('Line 1 of verse 2')).toBeInTheDocument();
    expect(screen.getByText('Line 2 of verse 2')).toBeInTheDocument();
    expect(screen.getByText('Verse 2')).toBeInTheDocument();
  });

  test('should navigate backwards correctly', () => {
    render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    const nextButton = screen.getByText('Next');
    const prevButton = screen.getByText('Previous');
    
    // Move forward
    fireEvent.click(nextButton);
    expect(screen.getByText('Line 3 of verse 1')).toBeInTheDocument();
    
    // Move back
    fireEvent.click(prevButton);
    expect(screen.getByText('Line 1 of verse 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2 of verse 1')).toBeInTheDocument();
  });

  test('should disable Previous button at the beginning', () => {
    render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    const prevButton = screen.getByText('Previous');
    expect(prevButton).toBeDisabled();
  });

  test('should allow direct verse navigation', () => {
    render(
      <LyricsDisplay songData={mockSongData} style={mockStyle} />
    );
    
    const verse2Button = screen.getByText('2');
    fireEvent.click(verse2Button);
    
    expect(screen.getByText('Line 1 of verse 2')).toBeInTheDocument();
    expect(screen.getByText('Line 2 of verse 2')).toBeInTheDocument();
    expect(screen.getByText('Verse 2')).toBeInTheDocument();
  });
});