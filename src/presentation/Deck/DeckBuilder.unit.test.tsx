import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockSend = jest.fn().mockResolvedValue(undefined);

// Mock session transport used by DeckBuilder
jest.mock('../../application/SessionTransport', () => ({
  createDeckSession: async () => ({
    peerId: 'mock-peer',
    sessionId: 'mock-session',
    send: mockSend,
    spawnPresent: jest.fn(async () => ({
      sessionId: 'mock-session',
      presentId: 'mock-present',
      url: '/presentation?sessionId=mock-session&presentId=mock-present',
    })),
    listPresents: jest.fn(async () => []),
    closePresent: jest.fn(async () => {}),
    onDeckEvent: jest.fn(() => () => {}),
    dispose: jest.fn(),
  }),
}));

// Mock fetch for library panel rendering
beforeEach(() => {
  mockSend.mockClear();
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

import DeckBuilder from './DeckBuilder';
import { shouldIgnorePresentShortcuts } from './presentShortcutGuard';

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

test('DeckBuilder disables library save with no deck', () => {
  render(<DeckBuilder />);

  // header
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Deck');

  // no deck message
  expect(screen.getByText('No deck loaded yet.')).toBeInTheDocument();

  expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
});

test('DeckBuilder shows present targets UI with send-to all default', async () => {
  render(<DeckBuilder />);
  await waitFor(() => expect(screen.getByTestId('present-targets')).toBeInTheDocument());
  expect(screen.getByTestId('send-target')).toHaveValue('all');
  expect(screen.getByTestId('present-list-empty')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByTestId('open-present')).toBeEnabled());
  expect(screen.getByTestId('deck-session-ready')).toHaveAttribute('data-ready', 'true');
});

test('DeckBuilder places the on-program preview in Presentation controls', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(VALID_DECK));

  const controls = await screen.findByTestId('presentation-controls');
  expect(controls).toContainElement(screen.getByTestId('program-thumbnail'));
  expect(screen.getByText('Deck metadata').closest('div')).not.toContainElement(
    screen.getByTestId('program-thumbnail'),
  );
});

test('Open Present (browser) opens about:blank before spawn and navigates with an absolute Present URL', async () => {
  delete (window as Window & { poster?: unknown }).poster;
  const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {
    return {
      closed: false,
      opener: null,
      focus: jest.fn(),
      close: jest.fn(),
      location: { href: '' },
    } as unknown as Window;
  });

  render(<DeckBuilder />);
  await waitFor(() => expect(screen.getByTestId('open-present')).toBeEnabled());

  await act(async () => {
    fireEvent.click(screen.getByTestId('open-present'));
  });

  await waitFor(() => {
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank', expect.any(String));
  });
  await waitFor(() => {
    const win = openSpy.mock.results[0]?.value as { location: { href: string } } | undefined;
    expect(win?.location.href).toContain('/presentation?');
    expect(win?.location.href.startsWith('http')).toBe(true);
    expect(win?.location.href.startsWith('/presentation')).toBe(false);
  });

  openSpy.mockRestore();
});

test('Open Present (Electron) skips about:blank and opens absolute Present URL directly', async () => {
  (window as Window & { poster?: unknown }).poster = {
    deckCommand: jest.fn(),
    presentEvent: jest.fn(),
    onDeckEvent: jest.fn(() => () => {}),
    onPresentPush: jest.fn(() => () => {}),
    pickLibraryFolder: jest.fn(),
  };
  const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {
    return { closed: false, focus: jest.fn(), close: jest.fn() } as unknown as Window;
  });

  try {
    render(<DeckBuilder />);
    await waitFor(() => expect(screen.getByTestId('open-present')).toBeEnabled());

    await act(async () => {
      fireEvent.click(screen.getByTestId('open-present'));
    });

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
    });
    expect(openSpy.mock.calls.some((call) => call[0] === 'about:blank')).toBe(false);
    const openedUrl = openSpy.mock.calls[0]?.[0] as string;
    expect(openedUrl).toContain('/presentation?');
    expect(openedUrl.startsWith('http')).toBe(true);
  } finally {
    delete (window as Window & { poster?: unknown }).poster;
    openSpy.mockRestore();
  }
});

test('Send Message omits slide so Present keeps the current program (no blank wipe)', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(VALID_DECK));
  await waitFor(() => expect(screen.getByTestId('open-present')).toBeEnabled());

  const field = screen.getByPlaceholderText(/type message to send/i);
  const sendMessage = screen.getByRole('button', { name: /send message/i });
  await act(async () => {
    fireEvent.change(field, { target: { value: 'Operator note' } });
  });
  await waitFor(() => expect(sendMessage).not.toBeDisabled());
  await act(async () => {
    fireEvent.click(sendMessage);
  });

  await waitFor(() => expect(mockSend).toHaveBeenCalled());
  const payload = mockSend.mock.calls[0][0];
  expect(payload.message).toBe('Operator note');
  expect(payload.slide).toBeUndefined();
});

test('does not render Library toggle; Export, Save, and Load remain', () => {
  render(<DeckBuilder />);
  expect(screen.queryByRole('button', { name: /^library$/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^export$/i })).toBeInTheDocument();
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

async function exportDeckJson(): Promise<any> {
  let capturedBlob: Blob | undefined;
  (global.URL as any).createObjectURL = jest.fn((b: Blob) => {
    capturedBlob = b;
    return 'blob:mock';
  });
  (global.URL as any).revokeObjectURL = jest.fn();
  const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((n: any) => n);

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^export$/i }));
  });

  expect(capturedBlob).toBeDefined();
  const text = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(capturedBlob!);
  });
  appendSpy.mockRestore();
  delete (global.URL as any).createObjectURL;
  delete (global.URL as any).revokeObjectURL;
  return JSON.parse(text);
}

test('new deck includes schemaVersion 1', async () => {
  render(<DeckBuilder />);

  // Click "New Deck" to create a fresh deck
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /new deck/i }));
  });

  const saved = await exportDeckJson();
  expect(saved.schemaVersion).toBe(1);
});

test('createNewDeck first TITLE does not bake titleFontSize / subTitleFontSize', async () => {
  render(<DeckBuilder />);
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /new deck/i }));
  });

  const saved = await exportDeckJson();
  expect(saved.slides[0].type).toBe('title');
  expect(saved.slides[0].titleFontSize).toBeUndefined();
  expect(saved.slides[0].subTitleFontSize).toBeUndefined();
});

test('new deck Font size change sends first title with GENERAL fontSize (no baked override)', async () => {
  render(<DeckBuilder />);
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /new deck/i }));
  });

  const fontSizeInput = screen.getByLabelText(/^font size:/i);
  await act(async () => {
    fireEvent.change(fontSizeInput, { target: { value: '60px' } });
  });

  await act(async () => {
    fireEvent.click(screen.getAllByRole('button', { name: /^send$/i })[0]);
  });

  await waitFor(() => expect(mockSend).toHaveBeenCalled());
  const payload = mockSend.mock.calls[0][0];
  expect(payload.slide.titleFontSize).toBeUndefined();
  expect(payload.slide.subTitleFontSize).toBeUndefined();
  expect(payload.slide.style.fontSize).toBe('60px');
});

test('imported deck with baked title sizes keeps them after Font size change', async () => {
  const bakedDeck = {
    title: 'Old Deck',
    slides: [
      {
        type: 'title',
        title: 'Title',
        subTitle: 'Sub',
        style: {},
        titleFontSize: '48px',
        subTitleFontSize: '28px',
      },
    ],
    slideStyles: {
      general: { fontSize: '24px' },
    },
  };
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(bakedDeck));
  await waitFor(() => screen.getByTestId('import-save-prompt'));
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
  });

  const fontSizeInput = screen.getByLabelText(/^font size:/i);
  await act(async () => {
    fireEvent.change(fontSizeInput, { target: { value: '60px' } });
  });

  await act(async () => {
    fireEvent.click(screen.getAllByRole('button', { name: /^send$/i })[0]);
  });

  await waitFor(() => expect(mockSend).toHaveBeenCalled());
  const payload = mockSend.mock.calls[0][0];
  expect(payload.slide.titleFontSize).toBe('48px');
  expect(payload.slide.subTitleFontSize).toBe('28px');
  expect(payload.slide.style.fontSize).toBe('60px');

  const saved = await exportDeckJson();
  expect(saved.slides[0].titleFontSize).toBe('48px');
  expect(saved.slides[0].subTitleFontSize).toBe('28px');
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

  act(() => { fireEvent.click(screen.getByRole('button', { name: /^export$/i })); });

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

test('AC-007: add song slide from library inserts without replacing other slides', async () => {
  (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('/library/songs')) {
      return {
        ok: true,
        json: async () => [
          {
            id: 'lib-song-1',
            title: 'Picked Song',
            book: 'Hymns',
            number: '9',
            lyrics: {
              title: 'Picked Song',
              verses: [{ number: 1, lines: ['Verse line'] }],
            },
          },
        ],
      } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  });

  render(<DeckBuilder />);
  const twoSlideDeck = {
    title: 'Keep Me',
    slides: [
      { type: 'general', title: 'Stay One', id: 'a' },
      { type: 'general', title: 'Stay Two', id: 'b' },
    ],
  };
  await loadFile(makeJsonFile(twoSlideDeck));
  await waitFor(() => expect(screen.getByText('Stay One')).toBeInTheDocument());

  const typeSelect = document.getElementById('add-slide-type') as HTMLSelectElement;
  fireEvent.change(typeSelect, { target: { value: 'song' } });
  fireEvent.click(screen.getByTestId('add-slide-button'));

  await waitFor(() => expect(screen.getByTestId('add-song-kind-picker')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('add-song-kind-linked'));

  await waitFor(() => expect(screen.getByTestId('add-song-slide-chooser')).toBeInTheDocument());
  expect(screen.getByTestId('add-song-mode-pick')).toBeChecked();
  await waitFor(() => expect(screen.getByTestId('add-song-pick-lib-song-1')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('add-song-pick-lib-song-1'));

  await waitFor(() => expect(screen.queryByTestId('add-song-slide-chooser')).not.toBeInTheDocument());
  expect(screen.getByText('Stay One')).toBeInTheDocument();
  expect(screen.getByText('Stay Two')).toBeInTheDocument();
  expect(screen.getByText('Picked Song')).toBeInTheDocument();
});

test('AC-019: Add slide > SONG scratch creates blank unlinked slide without chooser', async () => {
  render(<DeckBuilder />);
  const twoSlideDeck = {
    title: 'Keep Me',
    slides: [
      { type: 'general', title: 'Stay One', id: 'a' },
      { type: 'general', title: 'Stay Two', id: 'b' },
    ],
  };
  await loadFile(makeJsonFile(twoSlideDeck));
  await waitFor(() => expect(screen.getByText('Stay One')).toBeInTheDocument());

  const typeSelect = document.getElementById('add-slide-type') as HTMLSelectElement;
  fireEvent.change(typeSelect, { target: { value: 'song' } });
  fireEvent.click(screen.getByTestId('add-slide-button'));

  await waitFor(() => expect(screen.getByTestId('add-song-kind-picker')).toBeInTheDocument());
  expect(screen.queryByTestId('add-song-slide-chooser')).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId('add-song-kind-scratch'));

  await waitFor(() => expect(screen.queryByTestId('add-song-kind-picker')).not.toBeInTheDocument());
  expect(screen.queryByTestId('add-song-slide-chooser')).not.toBeInTheDocument();
  expect(screen.getByText('Stay One')).toBeInTheDocument();
  expect(screen.getByText('Stay Two')).toBeInTheDocument();
  expect(screen.getByText('Song')).toBeInTheDocument();

  // Open editor on the new song slide (last in list after insert at end when none selected — selection is on new slide).
  await waitFor(() => expect(screen.getByTestId('deck-slide-editor-panel')).toBeInTheDocument());
  expect(screen.getByTestId('slide-scratch-unlinked')).toBeInTheDocument();
  expect(screen.getByTestId('save-scratch-to-library')).toBeInTheDocument();
  expect(screen.queryByTestId('slide-library-song-id')).not.toBeInTheDocument();
});

test('AC-019: scratch Save to library sets librarySongId via ImportReviewScreen', async () => {
  (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/library/songs/import') && init?.method === 'POST') {
      return {
        ok: true,
        json: async () => ({ ids: ['saved-scratch-1'] }),
      } as Response;
    }
    if (url.includes('/library/songs') && !url.includes('/import')) {
      return {
        ok: true,
        json: async () => [
          {
            id: 'existing-1',
            title: 'Amazing Grace',
            book: 'Hymns',
            number: '1',
            lyrics: {
              title: 'Amazing Grace',
              verses: [{ number: 1, lines: ['Old line'] }],
            },
          },
        ],
      } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  });

  render(<DeckBuilder />);
  await loadFile(
    makeJsonFile({
      title: 'Deck',
      slides: [
        {
          type: 'song',
          title: 'Amazing Grace',
          id: 'scratch-1',
          lyrics: {
            title: 'Amazing Grace',
            verses: [{ number: 1, lines: ['New line'] }],
          },
        },
      ],
    }),
  );
  await waitFor(() => expect(screen.getByText('Amazing Grace')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await waitFor(() => expect(screen.getByTestId('slide-scratch-unlinked')).toBeInTheDocument());

  fireEvent.click(screen.getByTestId('save-scratch-to-library'));
  await waitFor(() => expect(screen.getByTestId('import-review-screen')).toBeInTheDocument());
  expect(screen.getByTestId('import-title-match-section')).toBeInTheDocument();
  expect(screen.getByTestId('import-match-scratch-save-keep_both')).toBeChecked();

  fireEvent.click(screen.getByTestId('import-confirm'));
  await waitFor(() =>
    expect(screen.getByTestId('slide-library-song-id')).toHaveAttribute(
      'data-library-song-id',
      'saved-scratch-1',
    ),
  );
  expect(screen.queryByTestId('slide-scratch-unlinked')).not.toBeInTheDocument();
});

test('REQ-026: ArrowRight does not move Present while focus is in the slide list', async () => {
  render(<DeckBuilder />);
  await loadFile(makeJsonFile(VALID_DECK));
  await waitFor(() => expect(screen.getByTestId('deck-session-ready')).toHaveAttribute('data-ready', 'true'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument());

  // Baseline: with focus outside, ArrowRight sends to Present.
  const outside = document.createElement('button');
  outside.type = 'button';
  outside.textContent = 'outside-focus';
  document.body.appendChild(outside);
  outside.focus();
  expect(shouldIgnorePresentShortcuts(document.activeElement)).toBe(false);
  mockSend.mockClear();
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  await waitFor(() => expect(mockSend).toHaveBeenCalled());

  // Focus a control inside the slide list — Present must not advance.
  const editBtn = screen.getByRole('button', { name: 'Edit' });
  editBtn.focus();
  expect(editBtn.closest('[data-testid="deck-slides-list"]')).toBeTruthy();
  expect(shouldIgnorePresentShortcuts(document.activeElement)).toBe(true);
  mockSend.mockClear();
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(mockSend).not.toHaveBeenCalled();
  outside.remove();
});

