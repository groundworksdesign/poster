import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LibrarySongPicker from './LibrarySongPicker';

const SONGS = [
  {
    id: 'a1',
    title: 'Amazing Grace',
    book: 'Hymns',
    number: '1',
    lyrics: { title: 'Amazing Grace', verses: [{ number: 1, lines: ['Amazing grace how sweet'] }] },
  },
  {
    id: 'a2',
    title: 'Amazing Grace',
    book: 'Hymns',
    number: '301',
    lyrics: { title: 'Amazing Grace', verses: [{ number: 1, lines: ['Different first verse'] }] },
  },
  {
    id: 'b1',
    title: 'Be Still',
    book: 'Hymns',
    number: '124',
    lyrics: { title: 'Be Still', verses: [{ number: 1, lines: ['Be still my soul unique'] }] },
  },
];

describe('LibrarySongPicker (AC-008, AC-012, AC-016, REQ-015)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockFetch(handler: (url: string) => unknown[]) {
    jest.spyOn(global, 'fetch').mockImplementation(async input => {
      const url = String(input);
      return {
        ok: true,
        json: async () => handler(url),
      } as Response;
    });
  }

  it('AC-008 / AC-016: searches via q= for title, book, number, and lyrics', async () => {
    mockFetch(url => {
      if (!url.includes('q=')) return SONGS;
      const raw = url.includes('q=') ? url.split('q=')[1].split('&')[0] : '';
      const q = decodeURIComponent(raw).toLowerCase();
      return SONGS.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          (s.book ?? '').toLowerCase().includes(q) ||
          (s.number ?? '').includes(q) ||
          s.lyrics.verses.some(v => v.lines.some(l => l.toLowerCase().includes(q))),
      );
    });

    render(<LibrarySongPicker onPick={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('library-song-row-a1')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('library-song-search'), {
      target: { value: 'unique' },
    });
    await waitFor(
      () => {
        expect(screen.getByTestId('library-song-row-b1')).toBeInTheDocument();
        expect(screen.queryByTestId('library-song-row-a1')).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('AC-012: shared titles show first verse inline', async () => {
    mockFetch(() => SONGS);
    render(<LibrarySongPicker onPick={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('library-song-verse-a1')).toBeInTheDocument());
    expect(screen.getByTestId('library-song-verse-a1')).toHaveTextContent('Amazing grace how sweet');
    expect(screen.getByTestId('library-song-verse-a2')).toHaveTextContent('Different first verse');
    expect(screen.queryByTestId('library-song-verse-b1')).not.toBeInTheDocument();
  });

  it('REQ-015 / Enter: picks linked song with librarySongId', async () => {
    mockFetch(() => SONGS);
    const onPick = jest.fn();
    render(<LibrarySongPicker onPick={onPick} />);
    await waitFor(() => expect(screen.getByTestId('library-song-row-a1')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByTestId('library-song-search'), { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({
        librarySongId: 'a1',
        lyrics: expect.objectContaining({ title: 'Amazing Grace' }),
      }),
    );
  });

  it('double-click inserts the chosen linked song', async () => {
    mockFetch(() => SONGS);
    const onPick = jest.fn();
    render(<LibrarySongPicker onPick={onPick} />);
    await waitFor(() => expect(screen.getByTestId('library-song-row-b1')).toBeInTheDocument());
    fireEvent.doubleClick(screen.getByTestId('library-song-row-b1'));
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ librarySongId: 'b1' }),
    );
  });

  it('results show title, book, and number', async () => {
    mockFetch(() => SONGS);
    render(<LibrarySongPicker onPick={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('add-song-pick-b1')).toBeInTheDocument());
    expect(screen.getByTestId('add-song-pick-b1')).toHaveTextContent('Be Still');
    expect(screen.getByTestId('add-song-pick-b1')).toHaveTextContent('Hymns');
    expect(screen.getByTestId('add-song-pick-b1')).toHaveTextContent('124');
  });
});
