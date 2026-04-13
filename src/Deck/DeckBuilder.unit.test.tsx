import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock Broadcast connection used by DeckBuilder to avoid BroadcastChannel in the test environment
jest.mock('../Present/Broadcast', () => ({
  connect: (channelType: any, handler: any) => ({
    id: 'mock-id',
    channel: { postMessage: jest.fn(), onmessage: null },
    channelType,
  }),
  ChannelType: { BUILDER: 0, PRESENTER: 1 },
}));

// Mock fetch for library panel rendering
beforeEach(() => {
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

test('Library toggle button shows and hides library panel', async () => {
  render(<DeckBuilder />);

  expect(screen.queryByTestId('library-panel')).not.toBeInTheDocument();

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^library$/i }));
  });

  expect(screen.getByTestId('library-panel')).toBeInTheDocument();

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^library$/i }));
  });

  expect(screen.queryByTestId('library-panel')).not.toBeInTheDocument();
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
  expect(fetchSpy).not.toHaveBeenCalledWith('/library/save', expect.anything());
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
  expect(global.fetch).toHaveBeenCalledWith('/library/save', expect.objectContaining({ method: 'POST' }));
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
