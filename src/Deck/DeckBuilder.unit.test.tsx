import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock Broadcast connection used by DeckBuilder to avoid BroadcastChannel in the test environment
const mockPostMessage = jest.fn();
jest.mock('../Present/Broadcast', () => ({
  connect: (channelType: any, handler: any) => ({
    id: 'mock-id',
    channel: { postMessage: mockPostMessage, onmessage: null },
    channelType,
  }),
  ChannelType: { BUILDER: 0, PRESENTER: 1 },
}));

// Mock fetch for library panel rendering
beforeEach(() => {
  mockPostMessage.mockClear();
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

import DeckBuilder from './DeckBuilder';

function makeJsonFile(content: object | string, name = 'deck.json'): File {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  return new File([text], name, { type: 'application/json' });
}

const VALID_DECK = {
  title: 'Test Deck',
  slides: [{ type: 'general', title: 'Slide 1' }],
};

const VALID_SONG_JSON = {
  title: 'My Song',
  author: 'Author',
  verses: [{ number: 1, lines: ['Line one', 'Line two'] }],
};

async function loadFile(file: File) {
  const input = document.querySelector<HTMLInputElement>('input[id="file"]');
  if (!input) throw new Error('file input not found');
  await act(async () => {
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^load$/i }));
  });
}

test('DeckBuilder shows header and handles save with no deck', () => {
  render(<DeckBuilder />);

  // header
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Deck');

  // no deck message
  expect(screen.getByText('No deck loaded yet.')).toBeInTheDocument();

  // click save and assert message
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
  });

  expect(screen.getByText('No deck to save')).toBeInTheDocument();
});

test('does not render Library toggle; Save and Load remain', () => {
  render(<DeckBuilder />);
  expect(screen.queryByRole('button', { name: /^library$/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^load$/i })).toBeInTheDocument();
});

test('import-save prompt appears after valid JSON deck import', async () => {
  render(<DeckBuilder />);
  expect(screen.queryByTestId('import-save-prompt')).not.toBeInTheDocument();
  await loadFile(makeJsonFile(VALID_DECK));
  await waitFor(() => expect(screen.getByTestId('import-save-prompt')).toBeInTheDocument());
});

test('import-save prompt appears after valid song JSON import', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(VALID_SONG_JSON, 'song.json'));
  await waitFor(() => expect(screen.getByTestId('import-save-prompt')).toBeInTheDocument());
});

test('clicking Skip dismisses the import-save prompt without calling /library/save', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(VALID_DECK));
  await waitFor(() => expect(screen.getByTestId('import-save-prompt')).toBeInTheDocument());

  const fetchSpy = jest.spyOn(global, 'fetch');
  act(() => { fireEvent.click(screen.getByRole('button', { name: /skip/i })); });

  expect(screen.queryByTestId('import-save-prompt')).not.toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringContaining('/library/save'), expect.anything());
});

test('clicking Save to Library from import prompt calls /library/save and dismisses prompt', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'new-lib-id' }),
  } as Response);

  render(<DeckBuilder />);
  await loadFile(makeJsonFile(VALID_DECK));
  await waitFor(() => expect(screen.getByTestId('import-save-prompt')).toBeInTheDocument());

  await act(async () => {
    fireEvent.click(screen.getByTestId('import-save-prompt').querySelector<HTMLButtonElement>('#import-save-to-library')!);
  });

  await waitFor(() => expect(screen.queryByTestId('import-save-prompt')).not.toBeInTheDocument());
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/library/save'),
    expect.objectContaining({ method: 'POST' }),
  );
});

test('import validation error does not show import-save prompt', async () => {
  render(<DeckBuilder />);
  const invalid = { slides: [{ type: 'general' }] }; // missing title
  await loadFile(makeJsonFile(invalid));
  await waitFor(() => expect(screen.getByText(/missing a 'title'/i)).toBeInTheDocument());
  expect(screen.queryByTestId('import-save-prompt')).not.toBeInTheDocument();
});

test('import-save prompt appears after valid XML song import', async () => {
  render(<DeckBuilder />);
  const xml = `<?xml version="1.0"?><song><title>XML Song</title><verse number="1"><line>Line one</line></verse></song>`;
  const xmlFile = new File([xml], 'song.xml', { type: 'text/xml' });
  await loadFile(xmlFile);
  await waitFor(() => expect(screen.getByTestId('import-save-prompt')).toBeInTheDocument());
});

test('imported JSON deck with id does not show prompt and sets libraryId', async () => {
  render(<DeckBuilder />);
  const deckWithId = { ...VALID_DECK, id: 'lib-123' };
  await loadFile(makeJsonFile(deckWithId));
  await waitFor(() => expect(screen.getByTestId('library-id')).toBeInTheDocument());
  expect(screen.getByTestId('library-id')).toHaveTextContent('Library ID: lib-123');
});

test('new deck includes schemaVersion 1', async () => {
  render(<DeckBuilder />);

  // Click "New Deck" to create a fresh deck
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /new deck/i }));
  });

  // Set up URL mocks (JSDOM does not provide URL.createObjectURL)
  let capturedBlob: Blob | undefined;
  (global.URL as any).createObjectURL = jest.fn((b: Blob) => {
    capturedBlob = b;
    return 'blob:mock';
  });
  (global.URL as any).revokeObjectURL = jest.fn();
  const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((n: any) => n);

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
  });

  expect(capturedBlob).toBeDefined();
  const text = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(capturedBlob!);
  });
  const saved = JSON.parse(text);
  expect(saved.schemaVersion).toBe(1);

  appendSpy.mockRestore();
  delete (global.URL as any).createObjectURL;
  delete (global.URL as any).revokeObjectURL;
});

test('imported JSON deck without schemaVersion defaults to 1', async () => {
  render(<DeckBuilder />);
  // VALID_DECK has no schemaVersion field
  await loadFile(makeJsonFile(VALID_DECK));
  await waitFor(() => screen.getByTestId('import-save-prompt'));

  // Set up URL mocks
  let capturedBlob: Blob | undefined;
  (global.URL as any).createObjectURL = jest.fn((b: Blob) => {
    capturedBlob = b;
    return 'blob:mock';
  });
  (global.URL as any).revokeObjectURL = jest.fn();
  const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((n: any) => n);

  act(() => { fireEvent.click(screen.getByRole('button', { name: /^save$/i })); });

  expect(capturedBlob).toBeDefined();
  const text = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(capturedBlob!);
  });
  const saved = JSON.parse(text);
  expect(saved.schemaVersion).toBe(1);

  appendSpy.mockRestore();
  delete (global.URL as any).createObjectURL;
  delete (global.URL as any).revokeObjectURL;
});

test('imported JSON deck with future schemaVersion emits console warning', async () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  render(<DeckBuilder />);
  const futureDeck = { ...VALID_DECK, schemaVersion: 999 };
  await loadFile(makeJsonFile(futureDeck));
  await waitFor(() => screen.getByTestId('import-save-prompt'));
  expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('schemaVersion 999'));
  warnSpy.mockRestore();
});

test('presentation controls appear when deck is loaded', async () => {
  render(<DeckBuilder />);
  expect(screen.queryByTestId('presentation-controls')).not.toBeInTheDocument();
  await loadFile(makeJsonFile(VALID_DECK));
  await waitFor(() => expect(screen.getByTestId('presentation-controls')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^end$/i })).toBeInTheDocument();
});

test('REQ-003+004: idle shows collapsed Edit rail, not full editor pane', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(VALID_DECK));
  await waitFor(() => screen.getByRole('button', { name: /^send$/i }));
  expect(screen.getByTestId('deck-slide-editor-rail')).toBeInTheDocument();
  expect(screen.queryByTestId('deck-slide-editor-panel')).not.toBeInTheDocument();
  // Would fail if old layout kept a full-width placeholder column instead of the rail.
  expect(screen.queryByText(/click edit on a slide/i)).not.toBeInTheDocument();
  const row = document.querySelector('.deck-slides-editor-row');
  expect(row?.getAttribute('data-editor-expanded')).toBe('false');
});

function clickSlideListEditButton() {
  const slides = document.getElementById('slides');
  if (!slides) throw new Error('slides list not found');
  const buttons = Array.from(slides.querySelectorAll<HTMLButtonElement>('button'));
  const edit = buttons.find(b => /^edit$/i.test(b.textContent?.trim() ?? ''));
  if (!edit) throw new Error('slide row Edit button not found');
  act(() => { fireEvent.click(edit); });
}

test('REQ-003+004: Edit expands editor beside list and hides rail', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(VALID_DECK));
  await waitFor(() => screen.getByRole('button', { name: /^send$/i }));
  expect(screen.getByTestId('deck-slide-editor-rail')).toBeInTheDocument();
  clickSlideListEditButton();
  expect(screen.getByTestId('deck-slide-editor-panel')).toBeInTheDocument();
  expect(screen.getByText(/editing slide 1/i)).toBeInTheDocument();
  expect(screen.queryByTestId('deck-slide-editor-rail')).not.toBeInTheDocument();
  expect(document.querySelector('.deck-slides-editor-row')?.getAttribute('data-editor-expanded')).toBe('true');
});

test('REQ-003+004: Close editor collapses back to Edit rail', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(VALID_DECK));
  await waitFor(() => screen.getByRole('button', { name: /^send$/i }));
  clickSlideListEditButton();
  expect(screen.getByTestId('deck-slide-editor-panel')).toBeInTheDocument();
  act(() => { fireEvent.click(screen.getByRole('button', { name: /close editor/i })); });
  expect(screen.queryByTestId('deck-slide-editor-panel')).not.toBeInTheDocument();
  expect(screen.getByTestId('deck-slide-editor-rail')).toBeInTheDocument();
  expect(document.querySelector('.deck-slides-editor-row')?.getAttribute('data-editor-expanded')).toBe('false');
});

test('slide row includes Top and Move reorder controls', async () => {
  render(<DeckBuilder />);
  const multiSlideDeck = {
    ...VALID_DECK,
    slides: [
      { type: 'general', title: 'Slide 1', id: 'a' },
      { type: 'general', title: 'Slide 2', id: 'b' },
    ],
  };
  await loadFile(makeJsonFile(multiSlideDeck));
  await waitFor(() => expect(screen.getAllByRole('button', { name: /^top$/i }).length).toBe(2));
  expect(screen.getAllByRole('button', { name: /^move$/i }).length).toBe(2);
});

test('Start with green screen sends blank output', async () => {
  render(<DeckBuilder />);
  const deck = {
    ...VALID_DECK,
    useGreenScreen: true,
    slides: [{ type: 'general', title: 'Slide 1', id: 's1' }],
  };
  await loadFile(makeJsonFile(deck));
  await waitFor(() => screen.getByTestId('presentation-controls'));
  mockPostMessage.mockClear();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
  });
  expect(mockPostMessage).toHaveBeenCalled();
  const payload = mockPostMessage.mock.calls[0][0];
  expect(payload.slide).toBeNull();
  expect(payload.useGreenScreen).toBe(true);
});

test('Start without green screen sends first slide', async () => {
  render(<DeckBuilder />);
  const deck = {
    ...VALID_DECK,
    useGreenScreen: false,
    slides: [{ type: 'general', title: 'Slide 1', id: 's1' }],
  };
  await loadFile(makeJsonFile(deck));
  await waitFor(() => screen.getByTestId('presentation-controls'));
  mockPostMessage.mockClear();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
  });
  const payload = mockPostMessage.mock.calls[0][0];
  expect(payload.slide).not.toBeNull();
  expect(payload.slide.title).toBe('Slide 1');
});

/** REQ-001: song with one lyric pair (stages 0 title, 1 lyrics, 2 blank) then a general slide. */
const SONG_THEN_GENERAL_DECK = {
  title: 'Song then general',
  slides: [
    {
      type: 'song',
      id: 'song-1',
      title: 'Hymn',
      subTitle: '',
      lyrics: {
        title: 'Hymn',
        verses: [{ number: 1, lines: ['Line A', 'Line B'] }],
      },
    },
    {
      type: 'general',
      id: 'general-1',
      title: 'After song',
    },
  ],
};

const SONG_ONLY_DECK = {
  title: 'Song only',
  slides: [
    {
      type: 'song',
      id: 'song-only',
      title: 'Last slide song',
      subTitle: '',
      lyrics: {
        title: 'Last slide song',
        verses: [{ number: 1, lines: ['Only A', 'Only B'] }],
      },
    },
  ],
};

function lastSentSlideTitle(): string | undefined {
  const calls = mockPostMessage.mock.calls;
  if (calls.length === 0) return undefined;
  return calls[calls.length - 1][0]?.slide?.title;
}

function lastSentSlideHasLyrics(): boolean {
  const calls = mockPostMessage.mock.calls;
  if (calls.length === 0) return false;
  return !!calls[calls.length - 1][0]?.slide?.lyrics;
}

/** Advance through every song stage via Presentation Next (same path as right-arrow). */
async function advanceSongThroughAllStagesViaNext() {
  // Start presents song at stage 0
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
  });
  // Stages 1 and 2 (lyrics pair, then terminal blank)
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  });
}

// REQ-001: after the last song stage, Next must send the next deck slide — not restart the song.
test('REQ-001: Presentation Next after last song stage sends next deck slide', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(SONG_THEN_GENERAL_DECK));
  await waitFor(() => screen.getByTestId('presentation-controls'));
  mockPostMessage.mockClear();

  await advanceSongThroughAllStagesViaNext();
  expect(lastSentSlideTitle()).toBe(''); // terminal blank stage before advancing to next slide

  mockPostMessage.mockClear();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  });

  const payload = mockPostMessage.mock.calls[0][0];
  expect(payload.slide.title).toBe('After song');
  expect(payload.slide.id).toBe('general-1');
  // Would fail if wrap-to-start returned: song restart sends title-only stage 0, not "After song"
});

// REQ-001: right-arrow shares the same step-forward path as Next.
test('REQ-001: right-arrow after last song stage sends next deck slide', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(SONG_THEN_GENERAL_DECK));
  await waitFor(() => screen.getByTestId('presentation-controls'));
  mockPostMessage.mockClear();

  await advanceSongThroughAllStagesViaNext();

  mockPostMessage.mockClear();
  act(() => {
    fireEvent.keyDown(window, { key: 'ArrowRight' });
  });

  expect(mockPostMessage).toHaveBeenCalled();
  expect(mockPostMessage.mock.calls[0][0].slide.title).toBe('After song');
});

// REQ-001: row Advance button uses the same last-stage rule as Next.
test('REQ-001: song row Advance after last stage sends next deck slide', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(SONG_THEN_GENERAL_DECK));
  await waitFor(() => screen.getByTestId('presentation-controls'));
  mockPostMessage.mockClear();

  await advanceSongThroughAllStagesViaNext();

  mockPostMessage.mockClear();
  act(() => {
    fireEvent.click(screen.getAllByRole('button', { name: /^advance$/i })[0]);
  });

  expect(mockPostMessage.mock.calls[0][0].slide.title).toBe('After song');
});

// REQ-001: mid-song Advance still steps lyrics, not deck slides.
test('REQ-001: mid-song Next still advances lyric stages', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(SONG_THEN_GENERAL_DECK));
  await waitFor(() => screen.getByTestId('presentation-controls'));
  mockPostMessage.mockClear();

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
  });
  mockPostMessage.mockClear();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  });

  expect(lastSentSlideHasLyrics()).toBe(true);
  expect(lastSentSlideTitle()).toBe('');
  expect(mockPostMessage.mock.calls[0][0].slide.id).toBe('song-1');
});

// REQ-001: last deck slide song must not wrap to song start when advanced past final stage.
test('REQ-001: last deck slide song does not wrap to song start', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(SONG_ONLY_DECK));
  await waitFor(() => screen.getByTestId('presentation-controls'));
  mockPostMessage.mockClear();

  await advanceSongThroughAllStagesViaNext();

  const callsBefore = mockPostMessage.mock.calls.length;
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  });

  expect(mockPostMessage.mock.calls.length).toBe(callsBefore);
  // Wrap-to-start would post another message with the song title stage; no-op is correct.
});

const THREE_SLIDE_DECK = {
  title: 'Three slides',
  slides: [
    { type: 'general', id: 'slide-a', title: 'Slide A' },
    { type: 'general', id: 'slide-b', title: 'Slide B' },
    { type: 'general', id: 'slide-c', title: 'Slide C' },
  ],
};

function queryShowingRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-showing="true"]'));
}

function showingSlideId(): string | null {
  const row = queryShowingRows()[0];
  return row?.getAttribute('data-slide-id') ?? null;
}

async function loadThreeSlideDeck() {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(THREE_SLIDE_DECK));
  await waitFor(() => screen.getByTestId('presentation-controls'));
}

// REQ-002: Start marks exactly one slide row as Showing (fails if highlight missing or duplicated).
test('REQ-002: Start marks exactly one Showing row by slide id', async () => {
  await loadThreeSlideDeck();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
  });
  expect(queryShowingRows()).toHaveLength(1);
  expect(showingSlideId()).toBe('slide-a');
  expect(screen.getAllByTestId('deck-slide-showing-label')).toHaveLength(1);
});

// REQ-002: End clears Showing so no stale row stays highlighted after blanking presenter.
test('REQ-002: End clears all Showing rows', async () => {
  await loadThreeSlideDeck();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
  });
  expect(queryShowingRows()).toHaveLength(1);
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^end$/i }));
  });
  expect(queryShowingRows()).toHaveLength(0);
  expect(screen.queryByTestId('deck-slide-showing-label')).not.toBeInTheDocument();
});

// REQ-002: Send updates which row is Showing.
test('REQ-002: Send updates Showing to the sent slide', async () => {
  await loadThreeSlideDeck();
  const sendButtons = screen.getAllByRole('button', { name: /^send$/i });
  act(() => {
    fireEvent.click(sendButtons[2]);
  });
  expect(queryShowingRows()).toHaveLength(1);
  expect(showingSlideId()).toBe('slide-c');
});

// REQ-002: Next and Previous update Showing.
test('REQ-002: Next and Previous update Showing row', async () => {
  await loadThreeSlideDeck();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
  });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  });
  expect(showingSlideId()).toBe('slide-b');

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^previous$/i }));
  });
  expect(showingSlideId()).toBe('slide-a');
});

// REQ-002: Go jump updates Showing.
test('REQ-002: Go updates Showing to jumped slide', async () => {
  await loadThreeSlideDeck();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
  });
  const jumpInput = document.querySelector<HTMLInputElement>('.deck-jump-input');
  if (!jumpInput) throw new Error('jump input not found');
  act(() => {
    fireEvent.change(jumpInput, { target: { value: '3' } });
  });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^go$/i }));
  });
  expect(showingSlideId()).toBe('slide-c');
});

// REQ-002: Showing follows slide identity after reorder, not a stale list index.
test('REQ-002: Showing follows slide id after Top reorder', async () => {
  await loadThreeSlideDeck();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
  });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  });
  expect(showingSlideId()).toBe('slide-b');

  const topButtons = screen.getAllByRole('button', { name: /^top$/i });
  act(() => {
    fireEvent.click(topButtons[1]);
  });

  expect(queryShowingRows()).toHaveLength(1);
  expect(showingSlideId()).toBe('slide-b');
  const showingRow = queryShowingRows()[0];
  expect(showingRow.textContent).toMatch(/^1\./);
});
