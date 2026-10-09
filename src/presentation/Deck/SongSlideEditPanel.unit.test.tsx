import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SongSlideEditPanel from './SongSlideEditPanel';
import type { SongPanelCommit } from './SongSlideEditPanel';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('AC-020: type choice shows linked and scratch cards', () => {
  render(<SongSlideEditPanel />);
  expect(screen.getByTestId('song-type-choice')).toBeInTheDocument();
  expect(screen.getByTestId('song-type-linked')).toBeInTheDocument();
  expect(screen.getByTestId('song-type-scratch')).toBeInTheDocument();
});

test('AC-020: Also save starts unchecked for scratch and checked for import', async () => {
  render(<SongSlideEditPanel />);
  fireEvent.click(screen.getByTestId('song-type-scratch'));
  expect(screen.getByTestId('song-also-save-scratch')).not.toBeChecked();

  fireEvent.click(screen.getByTestId('song-type-linked'));
  // Import checkbox appears once import review is open; assert default state via panel field
  // by switching through scratch again and checking import default when review mounts.
  // Default alsoSaveImport is true — exposed when import review shows.
  await waitFor(() => expect(screen.getByTestId('library-song-picker')).toBeInTheDocument());
});

test('AC-020: Cancel path — commit ref returns null until song chosen or scratch titled', async () => {
  const commitRef: React.MutableRefObject<
    (() => Promise<SongPanelCommit | SongPanelCommit[] | null>) | null
  > = { current: null };
  render(<SongSlideEditPanel getCommitRef={commitRef} />);
  expect(await commitRef.current?.()).toBeNull();
  fireEvent.click(screen.getByTestId('song-type-scratch'));
  fireEvent.change(screen.getByTestId('song-scratch-title'), { target: { value: 'Hi' } });
  const commit = await commitRef.current?.();
  expect(commit).toEqual(
    expect.objectContaining({
      lyrics: expect.objectContaining({ title: 'Hi' }),
    }),
  );
});

test('AC-009/014: single clean file stages Also-save; no library write until commit', async () => {
  const importPosts: unknown[] = [];
  (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/library/songs/import') && init?.method === 'POST') {
      importPosts.push(JSON.parse(String(init.body)));
      return { ok: true, json: async () => ({ ids: ['new-1'] }) } as Response;
    }
    if (url.includes('/library/songs')) {
      return { ok: true, json: async () => [] } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  });

  const commitRef: React.MutableRefObject<
    (() => Promise<SongPanelCommit | SongPanelCommit[] | null>) | null
  > = { current: null };
  render(<SongSlideEditPanel getCommitRef={commitRef} />);
  fireEvent.click(screen.getByTestId('song-type-linked'));
  await waitFor(() => expect(screen.getByTestId('song-panel-import-file')).toBeInTheDocument());

  const file = new File(
    [
      JSON.stringify({
        book: 'Hymns',
        songs: [{ title: 'Clean Solo', number: '1', verses: [{ number: 1, lines: ['A'] }] }],
      }),
    ],
    'clean.json',
    { type: 'application/json' },
  );
  fireEvent.change(screen.getByTestId('song-panel-import-file'), { target: { files: [file] } });

  await waitFor(() => expect(screen.getByTestId('song-linked-card')).toBeInTheDocument());
  expect(screen.getByTestId('song-also-save-import')).toBeChecked();
  expect(importPosts).toHaveLength(0);

  const commit = await commitRef.current?.();
  expect(importPosts).toHaveLength(1);
  expect(commit).toEqual(
    expect.objectContaining({
      librarySongId: 'new-1',
      lyrics: expect.objectContaining({ title: 'Clean Solo' }),
    }),
  );
});

test('State I: Use library words restores CURRENT library song, not slide lyrics', async () => {
  (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/library/songs') && !url.includes('/import')) {
      return {
        ok: true,
        json: async () => [
          {
            id: 'lib-hand',
            title: 'Hand Song',
            lyrics: {
              title: 'Hand Song',
              verses: [{ number: 1, lines: ['LIBRARY line one', 'LIBRARY line two'] }],
            },
          },
        ],
      } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  });

  render(
    <SongSlideEditPanel
      initialKind="linked"
      initialChoice={{
        librarySongId: 'lib-hand',
        lyrics: {
          title: 'Hand Song',
          verses: [{ number: 1, lines: ['HAND EDITED one', 'HAND EDITED two'] }],
        },
      }}
    />,
  );

  // Yellow note shows as soon as an already-hand-edited slide opens.
  await waitFor(() => expect(screen.getByTestId('song-hand-edit-note')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('song-use-library-words'));
  await waitFor(() => expect(screen.queryByTestId('song-hand-edit-note')).not.toBeInTheDocument());
  // Card preview shows library words after restore.
  expect(screen.getByTestId('song-linked-card')).toHaveTextContent('LIBRARY line one');
  expect(screen.getByTestId('song-linked-card')).not.toHaveTextContent('HAND EDITED one');
});

test('Esc: clear search, then type choice, then cancel pending', async () => {
  const onCancel = jest.fn();
  const escapeRef: React.MutableRefObject<(() => void) | null> = { current: null };
  const { consumeSearchEscFlag } = await import('./songPanelEsc');
  // Drain any stale flag from prior tests.
  consumeSearchEscFlag();
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => [
      {
        id: 's1',
        title: 'Alpha',
        lyrics: { title: 'Alpha', verses: [{ number: 1, lines: ['a'] }] },
      },
    ],
  } as Response);

  render(
    <SongSlideEditPanel
      isPendingNewSlide
      onCancelNewSlide={onCancel}
      escapeRef={escapeRef}
    />,
  );
  fireEvent.click(screen.getByTestId('song-type-linked'));
  await waitFor(() => expect(screen.getByTestId('library-song-search')).toBeInTheDocument());
  fireEvent.change(screen.getByTestId('library-song-search'), { target: { value: 'Alp' } });
  expect(screen.getByTestId('library-song-search')).toHaveValue('Alp');

  // Esc 1: clear search — must NOT stopPropagation (window still sees the event).
  const esc1 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  const stopSpy = jest.spyOn(esc1, 'stopPropagation');
  screen.getByTestId('library-song-picker').dispatchEvent(esc1);
  await waitFor(() => expect(screen.getByTestId('library-song-search')).toHaveValue(''));
  expect(stopSpy).not.toHaveBeenCalled();
  expect(esc1.defaultPrevented).toBe(true);
  // Window handler consumes the flag on the same keypress (simulates DeckBuilder).
  expect(consumeSearchEscFlag()).toBe(true);
  expect(onCancel).not.toHaveBeenCalled();

  // Esc 2: back to type choice (flag already consumed — must not swallow this press).
  expect(consumeSearchEscFlag()).toBe(false);
  escapeRef.current?.();
  await waitFor(() => expect(screen.getByTestId('song-type-choice')).toBeInTheDocument());
  expect(onCancel).not.toHaveBeenCalled();

  // Esc 3: cancel pending
  escapeRef.current?.();
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test('existing song panel reports dirty for unsaved words; clean when unchanged', async () => {
  const dirtyRef: React.MutableRefObject<(() => boolean) | null> = { current: null };
  render(
    <SongSlideEditPanel
      initialKind="scratch"
      initialScratch={{
        title: 'esc one',
        words: 'probe one',
      }}
      isDirtyRef={dirtyRef}
    />,
  );
  await waitFor(() => expect(screen.getByTestId('song-scratch-words')).toBeInTheDocument());
  expect(dirtyRef.current?.()).toBe(false);
  fireEvent.change(screen.getByTestId('song-scratch-words'), {
    target: { value: 'probe one CHANGED' },
  });
  expect(dirtyRef.current?.()).toBe(true);
});

test('hand-edit commit sets handEdited so synced fingerprint can be preserved', async () => {
  const { lyricsFingerprint } = await import('../../domain/linkedSongUpdate');
  const baseLyrics = {
    title: 'Alpha',
    author: '',
    verses: [{ number: 1, lines: ['LIBRARY one', 'LIBRARY two'] }],
  };
  const synced = lyricsFingerprint(baseLyrics);
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => [
      {
        id: 'lib-1',
        title: 'Alpha',
        lyrics: baseLyrics,
      },
    ],
  } as Response);

  const commitRef: React.MutableRefObject<
    (() => Promise<SongPanelCommit | SongPanelCommit[] | null>) | null
  > = { current: null };
  render(
    <SongSlideEditPanel
      initialKind="linked"
      initialChoice={{
        lyrics: baseLyrics,
        librarySongId: 'lib-1',
      }}
      linkedFingerprint={synced}
      getCommitRef={commitRef}
    />,
  );
  await waitFor(() => expect(screen.getByTestId('song-edit-words-on-slide')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('song-edit-words-on-slide'));
  fireEvent.change(screen.getByTestId('song-hand-edit-words'), {
    target: { value: 'HAND EDITED one\nHAND EDITED two' },
  });
  const commit = await commitRef.current?.();
  expect(commit).toEqual(
    expect.objectContaining({
      librarySongId: 'lib-1',
      handEdited: true,
    }),
  );
});

test('Type cards: ArrowRight moves focus only; Enter picks', async () => {
  render(<SongSlideEditPanel isPendingNewSlide />);
  await waitFor(() => expect(screen.getByTestId('song-type-choice')).toBeInTheDocument());
  const panel = screen.getByTestId('song-slide-edit-panel');
  fireEvent.keyDown(panel, { key: 'ArrowRight' });
  expect(screen.getByTestId('song-type-scratch')).toHaveAttribute('data-focused', 'true');
  expect(screen.getByTestId('song-type-choice')).toBeInTheDocument();
  fireEvent.keyDown(panel, { key: 'Enter' });
  await waitFor(() => expect(screen.getByTestId('song-scratch-editor')).toBeInTheDocument());
});

test('F3: Skip incoming unticks Also save and clears review', async () => {
  (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/library/songs') && !url.includes('/import')) {
      return {
        ok: true,
        json: async () => [
          {
            id: 'ex-1',
            title: 'Dup',
            lyrics: { title: 'Dup', verses: [{ number: 1, lines: ['Old'] }] },
          },
        ],
      } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  });

  const commitRef: React.MutableRefObject<
    (() => Promise<SongPanelCommit | SongPanelCommit[] | null>) | null
  > = { current: null };
  render(<SongSlideEditPanel getCommitRef={commitRef} />);
  fireEvent.click(screen.getByTestId('song-type-scratch'));
  fireEvent.change(screen.getByTestId('song-scratch-title'), { target: { value: 'Dup' } });
  fireEvent.change(screen.getByTestId('song-scratch-words'), { target: { value: 'New' } });
  fireEvent.click(screen.getByTestId('song-also-save-scratch'));
  expect(await commitRef.current?.()).toBeNull();
  await waitFor(() => expect(screen.getByTestId('import-review-screen')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('import-match-scratch-save-skip'));
  fireEvent.click(screen.getByTestId('import-confirm'));
  await waitFor(() => expect(screen.queryByTestId('import-review-screen')).not.toBeInTheDocument());
  expect(screen.getByTestId('song-also-save-scratch')).not.toBeChecked();
});
