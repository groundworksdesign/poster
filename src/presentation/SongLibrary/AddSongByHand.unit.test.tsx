import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddSongByHand from './AddSongByHand';

describe('AddSongByHand (AC-002)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts one song and finds it afterward', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/library/songs/save') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        expect(body.title).toBe('Hand Added Hymn');
        expect(body.book).toBe('Hymns');
        expect(body.number).toBe('1');
        expect(body.lyrics.verses[0].lines[0]).toBe('First line');
        return {
          ok: true,
          json: async () => ({ ok: true, id: 'song-1' }),
        } as Response;
      }
      if (url.includes('/library/songs') && url.includes('q=')) {
        expect(decodeURIComponent(url)).toContain('Hand Added Hymn');
        return {
          ok: true,
          json: async () => [
            {
              id: 'song-1',
              title: 'Hand Added Hymn',
              book: 'Hymns',
              number: '1',
            },
          ],
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    render(<AddSongByHand />);

    fireEvent.change(screen.getByTestId('add-song-title'), {
      target: { value: 'Hand Added Hymn' },
    });
    fireEvent.change(screen.getByTestId('add-song-book'), { target: { value: 'Hymns' } });
    fireEvent.change(screen.getByTestId('add-song-number'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('add-song-verses'), {
      target: { value: 'First line\nSecond line' },
    });
    fireEvent.click(screen.getByTestId('add-song-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('add-song-status')).toHaveTextContent(/Saved "Hand Added Hymn"/i);
    });
    await waitFor(() => {
      expect(screen.getByTestId('find-song-row')).toHaveTextContent('Hand Added Hymn');
      expect(screen.getByTestId('find-song-row')).toHaveTextContent('Hymns');
      expect(screen.getByTestId('find-song-row')).toHaveTextContent('1');
    });

    expect(fetchMock).toHaveBeenCalled();
  });

  it('requires a title before saving', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    render(<AddSongByHand />);
    fireEvent.click(screen.getByTestId('add-song-submit'));
    expect(await screen.findByTestId('add-song-error')).toHaveTextContent(/Title is required/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
