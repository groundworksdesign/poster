import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddSongSlideChooser from './AddSongSlideChooser';

function mockFile(name: string, text: string): File {
  const file = new File([text], name, { type: 'application/json' });
  (file as any).text = async () => text;
  return file;
}

describe('AddSongSlideChooser (AC-007, AC-009, AC-014, import review)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('AC-017: links to song library manage page', () => {
    render(<AddSongSlideChooser onCancel={jest.fn()} onChoose={jest.fn()} />);
    expect(screen.getByTestId('add-song-open-library')).toHaveAttribute('href', '/library/songs');
  });

  it('defaults to Pick from library and lists songs', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 's1',
          title: 'Library Hymn',
          book: 'Hymns',
          number: '3',
          lyrics: { title: 'Library Hymn', verses: [{ number: 1, lines: ['Line'] }] },
        },
      ],
    } as Response);

    const onChoose = jest.fn();
    render(<AddSongSlideChooser onCancel={jest.fn()} onChoose={onChoose} />);

    expect(screen.getByTestId('add-song-mode-pick')).toBeChecked();
    await waitFor(() => expect(screen.getByTestId('add-song-pick-s1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('add-song-pick-s1'));
    expect(onChoose).toHaveBeenCalledWith(
      expect.objectContaining({
        librarySongId: 's1',
        lyrics: expect.objectContaining({ title: 'Library Hymn' }),
      }),
    );
  });

  it('empty library points to Import or Add by hand', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    render(<AddSongSlideChooser onCancel={jest.fn()} onChoose={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('add-song-library-empty')).toBeInTheDocument());
    expect(screen.getByTestId('add-song-go-hand')).toHaveAttribute('href', '/library/songs/add');
    fireEvent.click(screen.getByTestId('add-song-go-import'));
    expect(screen.getByTestId('add-song-mode-import')).toBeChecked();
  });

  it('AC-014: Also save defaults checked; AC-009: clean single saves via import only when checked', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (
        url.includes('/library/songs') &&
        !url.includes('/import') &&
        !url.includes('/save') &&
        (!init || !init.method || init.method === 'GET')
      ) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (url.includes('/library/songs/import') && init?.method === 'POST') {
        return { ok: true, json: async () => ({ ok: true, ids: ['saved-1'], importedCount: 1 }) } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    const onChoose = jest.fn();
    render(<AddSongSlideChooser onCancel={jest.fn()} onChoose={onChoose} />);
    fireEvent.click(screen.getByTestId('add-song-mode-import'));

    const alsoSave = await screen.findByTestId('add-song-also-save');
    expect(alsoSave).toBeChecked();

    const file = mockFile(
      'song.json',
      JSON.stringify({ title: 'Imported', verses: [{ number: 1, lines: ['Hi'] }] }),
    );
    fireEvent.change(screen.getByTestId('add-song-import-file'), { target: { files: [file] } });

    await waitFor(() => expect(onChoose).toHaveBeenCalled());
    const first = onChoose.mock.calls[0][0];
    const choice = Array.isArray(first) ? first[0] : first;
    expect(choice.librarySongId).toBe('saved-1');
    expect(
      fetchMock.mock.calls.some(
        c => String(c[0]).includes('/library/songs/import') && c[1]?.method === 'POST',
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(
        c => String(c[0]).includes('/library/songs/save') && c[1]?.method === 'POST',
      ),
    ).toBe(false);

    onChoose.mockClear();
    fetchMock.mockClear();
    fireEvent.click(alsoSave);
    expect(alsoSave).not.toBeChecked();
    fireEvent.change(screen.getByTestId('add-song-import-file'), { target: { files: [file] } });
    await waitFor(() => expect(onChoose).toHaveBeenCalled());
    const second = onChoose.mock.calls[0][0];
    const choice2 = Array.isArray(second) ? second[0] : second;
    expect(choice2.librarySongId).toBeUndefined();
    expect(
      fetchMock.mock.calls.some(
        c => String(c[0]).includes('/library/songs/import') && c[1]?.method === 'POST',
      ),
    ).toBe(false);
  });

  it('REQ-005/006/019/022: duplicate title + no-lyrics show review; keep_both default; no silent save', async () => {
    const importPosts: unknown[] = [];
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (
        url.includes('/library/songs') &&
        !url.includes('/import') &&
        (!init || !init.method || init.method === 'GET')
      ) {
        return {
          ok: true,
          json: async () => [
            {
              id: 'exist-1',
              title: 'Amazing Grace',
              book: 'Hymns',
              number: '1',
              lyrics: {
                title: 'Amazing Grace',
                verses: [{ number: 1, lines: ['Amazing grace how sweet'] }],
              },
            },
          ],
        } as Response;
      }
      if (url.includes('/library/songs/import') && init?.method === 'POST') {
        importPosts.push(JSON.parse(String(init.body)));
        return {
          ok: true,
          json: async () => ({ ok: true, ids: ['n1', 'n2'], importedCount: 2 }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    const onChoose = jest.fn();
    render(<AddSongSlideChooser onCancel={jest.fn()} onChoose={onChoose} />);
    fireEvent.click(screen.getByTestId('add-song-mode-import'));

    const file = mockFile(
      'book.json',
      JSON.stringify({
        book: 'Hymns',
        songs: [
          {
            title: 'Amazing Grace',
            number: '301',
            verses: [{ number: 1, lines: ['Different lyrics here'] }],
          },
          { title: 'Empty Title', number: '9', verses: [] },
        ],
      }),
    );
    fireEvent.change(screen.getByTestId('add-song-import-file'), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByTestId('import-review-screen')).toBeInTheDocument());
    expect(importPosts).toHaveLength(0);
    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByTestId('import-title-match-section')).toBeInTheDocument();
    expect(screen.getByTestId('import-match-song-0-keep_both')).toBeChecked();
    expect(screen.getByText(/Number: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Amazing grace how sweet/i)).toBeInTheDocument();
    expect(screen.getByTestId('import-no-lyrics-section')).toBeInTheDocument();
    expect(screen.getByTestId('import-no-lyrics-title-only')).toBeChecked();

    fireEvent.click(screen.getByTestId('import-confirm'));
    await waitFor(() => expect(onChoose).toHaveBeenCalled());
    expect(importPosts).toHaveLength(1);
    const body = importPosts[0] as { songs: Array<{ title: string; id?: string; lyrics: { verses: unknown[] } }> };
    expect(body.songs.map(s => s.title)).toEqual(['Amazing Grace', 'Empty Title']);
    expect(body.songs[0].id).toBeUndefined(); // keep_both = new row, not replace
    expect(body.songs[1].lyrics.verses).toEqual([]);

    const choices = onChoose.mock.calls[0][0];
    expect(Array.isArray(choices)).toBe(true);
    expect(choices).toHaveLength(2);
    expect(choices[0].librarySongId).toBe('n1');
    expect(choices[1].lyrics.verses).toEqual([]);
  });
});
