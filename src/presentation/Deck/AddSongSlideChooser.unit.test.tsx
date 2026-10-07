import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddSongSlideChooser from './AddSongSlideChooser';

function mockFile(name: string, text: string): File {
  const file = new File([text], name, { type: 'application/json' });
  (file as any).text = async () => text;
  return file;
}

describe('AddSongSlideChooser (AC-007, AC-009, AC-014)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
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

  it('AC-014: Also save checkbox defaults checked; AC-009: saves only when checked', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/library/songs') && !url.includes('/save') && (!init || !init.method || init.method === 'GET')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (url.includes('/library/songs/save') && init?.method === 'POST') {
        return { ok: true, json: async () => ({ ok: true, id: 'saved-1' }) } as Response;
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

    await waitFor(() => expect(screen.getByTestId('add-song-import-confirm')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('add-song-import-confirm'));

    await waitFor(() => expect(onChoose).toHaveBeenCalled());
    expect(onChoose.mock.calls[0][0].librarySongId).toBe('saved-1');
    expect(
      fetchMock.mock.calls.some(
        c => String(c[0]).includes('/library/songs/save') && c[1]?.method === 'POST',
      ),
    ).toBe(true);

    onChoose.mockClear();
    fetchMock.mockClear();
    fireEvent.click(alsoSave); // uncheck
    expect(alsoSave).not.toBeChecked();
    fireEvent.click(screen.getByTestId('add-song-import-confirm'));
    await waitFor(() => expect(onChoose).toHaveBeenCalled());
    expect(onChoose.mock.calls[0][0].librarySongId).toBeUndefined();
    expect(
      fetchMock.mock.calls.some(
        c => String(c[0]).includes('/library/songs/save') && c[1]?.method === 'POST',
      ),
    ).toBe(false);
  });
});
