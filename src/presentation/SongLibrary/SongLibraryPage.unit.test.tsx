import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SongLibraryPage from './SongLibraryPage';

const SONGS = [
  {
    id: 's1',
    title: 'Amazing Grace',
    book: 'Hymns',
    number: '1',
    lyrics: { title: 'Amazing Grace', verses: [{ number: 1, lines: ['Amazing grace how sweet'] }] },
    usedInDeckCount: 2,
  },
  {
    id: 's2',
    title: 'Be Still',
    book: 'Hymns',
    number: '124',
    lyrics: { title: 'Be Still', verses: [{ number: 1, lines: ['Be still my soul'] }] },
    usedInDeckCount: 0,
  },
];

describe('SongLibraryPage (AC-017, REQ-011, used-in-N-decks)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockFetch(handler: (url: string, init?: RequestInit) => unknown) {
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const body = handler(url, init);
      return {
        ok: true,
        json: async () => body,
      } as Response;
    });
  }

  it('AC-017: page shows search, Add, Import, Edit, Delete, and used-in counts', async () => {
    mockFetch(url => {
      if (url.includes('/library/songs') && url.includes('usage=1')) return SONGS;
      return [];
    });

    render(<SongLibraryPage />);
    expect(screen.getByTestId('song-library-page')).toBeInTheDocument();
    expect(screen.getByTestId('song-library-add')).toHaveAttribute('href', '/library/songs/add');
    expect(screen.getByTestId('song-library-import')).toHaveAttribute(
      'href',
      '/library/songs/import',
    );
    expect(screen.getByTestId('song-library-search')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId('song-library-row-s1')).toBeInTheDocument());
    expect(screen.getByTestId('song-library-usage-s1')).toHaveTextContent('Used in 2 decks');
    expect(screen.getByTestId('song-library-usage-s2')).toHaveTextContent('Used in 0 decks');
    expect(screen.getByTestId('song-library-edit-s1')).toBeInTheDocument();
    expect(screen.getByTestId('song-library-delete-s1')).toBeInTheDocument();
  });

  it('REQ-011: edit saves via /library/songs/save with id', async () => {
    const posts: Array<{ url: string; body: unknown }> = [];
    mockFetch((url, init) => {
      if (url.includes('/library/songs/save') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        posts.push({ url, body });
        return { ok: true, id: body.id };
      }
      if (url.includes('/library/songs') && url.includes('usage=1')) return SONGS;
      return [];
    });

    render(<SongLibraryPage />);
    await waitFor(() => expect(screen.getByTestId('song-library-edit-s2')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('song-library-edit-s2'));
    expect(screen.getByTestId('song-library-edit-form')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('song-library-edit-title'), {
      target: { value: 'Be Still Updated' },
    });
    fireEvent.click(screen.getByTestId('song-library-edit-save'));

    await waitFor(() => expect(posts.length).toBe(1));
    expect(posts[0].body).toEqual(
      expect.objectContaining({
        id: 's2',
        title: 'Be Still Updated',
      }),
    );
  });

  it('REQ-011: delete posts to /library/songs/delete/:id', async () => {
    const deletes: string[] = [];
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockFetch((url, init) => {
      if (url.includes('/library/songs/delete/') && init?.method === 'POST') {
        deletes.push(url);
        return { ok: true, id: 's2' };
      }
      if (url.includes('/library/songs') && url.includes('usage=1')) {
        return deletes.length ? SONGS.filter(s => s.id !== 's2') : SONGS;
      }
      return [];
    });

    render(<SongLibraryPage />);
    await waitFor(() => expect(screen.getByTestId('song-library-delete-s2')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('song-library-delete-s2'));

    await waitFor(() => expect(deletes.length).toBe(1));
    expect(deletes[0]).toContain('/library/songs/delete/s2');
    expect(window.confirm).toHaveBeenCalled();
  });

  it('searches with q= and usage=1', async () => {
    const urls: string[] = [];
    mockFetch(url => {
      urls.push(url);
      if (!url.includes('q=')) return SONGS;
      return [SONGS[1]];
    });

    render(<SongLibraryPage />);
    await waitFor(() => expect(screen.getByTestId('song-library-row-s1')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('song-library-search'), {
      target: { value: 'still' },
    });
    await waitFor(
      () => {
        expect(screen.getByTestId('song-library-row-s2')).toBeInTheDocument();
        expect(screen.queryByTestId('song-library-row-s1')).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
    expect(urls.some(u => u.includes('q=still') && u.includes('usage=1'))).toBe(true);
  });
});
