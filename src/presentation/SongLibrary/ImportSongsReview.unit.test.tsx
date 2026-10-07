import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImportSongsReview from './ImportSongsReview';

function mockFile(name: string, text: string): File {
  const file = new File([text], name, { type: 'application/json' });
  // jsdom File may not implement text(); polyfill for the component.
  (file as any).text = async () => text;
  return file;
}

describe('ImportSongsReview (library import; does not touch deck)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('AC-022: single clean song skips review and POSTs import only (no deck)', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/library/songs') && !url.includes('/import') && (!init || !init.method || init.method === 'GET')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (url.includes('/library/songs/import') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        expect(body.songs).toHaveLength(1);
        expect(body.songs[0].title).toBe('Clean Solo');
        expect(body).not.toHaveProperty('deck');
        expect(body).not.toHaveProperty('slides');
        return {
          ok: true,
          json: async () => ({ ok: true, ids: ['n1'], importedCount: 1 }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    render(<ImportSongsReview />);
    const input = screen.getByTestId('import-songs-file') as HTMLInputElement;
    const file = mockFile(
      'clean.json',
      JSON.stringify({ title: 'Clean Solo', verses: [{ number: 1, lines: ['Hi'] }] }),
    );
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('import-songs-status')).toHaveTextContent(/Imported 1 song/i);
    });
    expect(screen.queryByTestId('import-review-screen')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(c => String(c[0]).includes('/library/save'))).toBe(false);
  });

  it('AC-004: multi-song shows review and does not import until confirm', async () => {
    const importPosts: unknown[] = [];
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/library/songs') && !url.includes('/import') && (!init || !init.method || init.method === 'GET')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (url.includes('/library/songs/import') && init?.method === 'POST') {
        importPosts.push(JSON.parse(String(init.body)));
        return {
          ok: true,
          json: async () => ({ ok: true, ids: ['a', 'b'], importedCount: 2 }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    render(<ImportSongsReview />);
    const file = mockFile(
      'book.json',
      JSON.stringify({
        book: 'Hymns',
        songs: [
          { title: 'One', number: '1', verses: [{ number: 1, lines: ['A'] }] },
          { title: 'Two', number: '2', verses: [{ number: 1, lines: ['B'] }] },
        ],
      }),
    );
    fireEvent.change(screen.getByTestId('import-songs-file'), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('import-review-screen')).toBeInTheDocument();
    });
    expect(importPosts).toHaveLength(0);
    expect(screen.queryByTestId('import-no-lyrics-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('import-title-match-section')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('import-confirm'));
    await waitFor(() => {
      expect(importPosts).toHaveLength(1);
    });
    expect((importPosts[0] as any).songs).toHaveLength(2);
  });

  it('AC-006 / AC-015: title match section defaults to keep both', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/library/songs') && !url.includes('/import') && (!init || !init.method || init.method === 'GET')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 'lib-1',
              title: 'Amazing Grace',
              book: 'Hymns',
              number: '1',
              lyrics: { title: 'Amazing Grace', verses: [{ number: 1, lines: ['Old line'] }] },
            },
          ],
        } as Response;
      }
      if (url.includes('/library/songs/import') && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ ok: true, ids: ['n'], importedCount: 1 }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    render(<ImportSongsReview />);
    const file = mockFile(
      'more.json',
      JSON.stringify({
        songs: [
          {
            title: 'Amazing Grace',
            number: '301',
            verses: [{ number: 1, lines: ['New line'] }],
          },
        ],
      }),
    );
    fireEvent.change(screen.getByTestId('import-songs-file'), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('import-title-match-section')).toBeInTheDocument();
    });
    const keepBoth = screen.getByTestId('import-match-song-0-keep_both') as HTMLInputElement;
    expect(keepBoth.checked).toBe(true);
    expect(screen.getByTestId('import-title-match-song-0')).toHaveTextContent('301');
    expect(screen.getByTestId('import-title-match-song-0')).toHaveTextContent('Old line');
    expect(screen.getByTestId('import-title-match-song-0')).toHaveTextContent('New line');
  });

  it('AC-005: no-lyrics section appears and defaults to title only', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/library/songs') && !url.includes('/import') && (!init || !init.method || init.method === 'GET')) {
        return { ok: true, json: async () => [] } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    render(<ImportSongsReview />);
    const file = mockFile(
      'empty.json',
      JSON.stringify({
        songs: [
          { title: 'Empty', verses: [] },
          { title: 'Full', verses: [{ number: 1, lines: ['Words'] }] },
        ],
      }),
    );
    fireEvent.change(screen.getByTestId('import-songs-file'), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('import-no-lyrics-section')).toBeInTheDocument();
    });
    expect((screen.getByTestId('import-no-lyrics-title-only') as HTMLInputElement).checked).toBe(
      true,
    );
  });
});
