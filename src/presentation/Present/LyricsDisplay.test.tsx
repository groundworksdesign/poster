import React from 'react';
import { render } from '@testing-library/react';
import LyricsDisplay from './LyricsDisplay';
import { SongData } from '../../domain/PresentTypes';

test('handles odd number of lines and clamps segmentIndex', () => {
  const song: SongData = {
    title: 'Odd Song',
    verses: [{ number: 1, lines: ['L1', 'L2', 'L3'] }],
  };
  const { container, rerender } = render(<LyricsDisplay song={song} segmentIndex={0} />);
  const lyrics = container.querySelector('#lyrics');
  expect(lyrics).toBeTruthy();
  expect(lyrics?.textContent).toContain('L1');
  expect(lyrics?.textContent).toContain('L2');

  // move to second segment (index 1)
  rerender(<LyricsDisplay song={song} segmentIndex={1} />);
  expect(lyrics?.textContent).toContain('L3');

  // segmentIndex beyond bounds clamps to last
  rerender(<LyricsDisplay song={song} segmentIndex={10} />);
  expect(lyrics?.textContent).toContain('L3');
});

test('renders blanks for empty verses', () => {
  const song: SongData = { title: 'Empty', verses: [] };
  const { container } = render(<LyricsDisplay song={song} segmentIndex={0} />);
  const lyrics = container.querySelector('#lyrics');
  expect(lyrics).toBeTruthy();
  expect((lyrics?.textContent || '').trim()).toBe('');
});
