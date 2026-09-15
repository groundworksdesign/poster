import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from './HomePage';
import { notifyLibraryChanged } from './libraryRefresh';
import { THEME_STORAGE_KEY, applyTheme } from './useTheme';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  } as Response);
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('deck builder link opens a new window without same-tab navigation', () => {
  const openSpy = jest
    .spyOn(window, 'open')
    .mockReturnValue({ focus: jest.fn(), opener: null } as any);
  render(<HomePage />);
  const link = screen.getByRole('link', { name: /open deck builder/i });
  expect(link).not.toHaveAttribute('target', '_blank');
  fireEvent.click(link);
  expect(openSpy).toHaveBeenCalledWith(
    expect.stringContaining('/deck'),
    'posterDeck',
    expect.any(String),
  );
  openSpy.mockRestore();
});

test('Home lists Open Presentation targeting /deck (not bare /presentation)', () => {
  render(<HomePage />);
  const openPresentation = screen.getByTestId('open-presentation');
  expect(openPresentation).toHaveAttribute('href', '/deck');
  expect(openPresentation).toHaveTextContent(/Open Presentation/i);
  expect(screen.queryByRole('link', { name: /^open present$/i })).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: /open presentation \(new window\)/i }),
  ).not.toBeInTheDocument();
  const workflowHrefs = screen
    .queryAllByRole('link')
    .map((link) => link.getAttribute('href') || '')
    .filter((href) => href.startsWith('/deck') || href.startsWith('/presentation'));
  expect(workflowHrefs).toEqual(['/deck', '/deck', '/deck?focusImport=1']);
});

test('Open Presentation opens a deck window and leaves Home put', () => {
  const openSpy = jest.spyOn(window, 'open').mockReturnValue({
    opener: null,
    focus: jest.fn(),
  } as unknown as Window);

  render(<HomePage />);
  expect(screen.getByRole('heading', { level: 1, name: 'Poster' })).toBeInTheDocument();

  fireEvent.click(screen.getByTestId('open-presentation'));

  expect(openSpy).toHaveBeenCalled();
  const [url] = openSpy.mock.calls[0];
  expect(String(url)).toContain('/deck');
  expect(String(url)).not.toMatch(/\/presentation/);
  expect(screen.getByRole('heading', { level: 1, name: 'Poster' })).toBeInTheDocument();
  expect(screen.getByText(/library of saved presentations/i)).toBeInTheDocument();
});

test('REQ-009: Import a file uses _blank + POPUP_FEATURES (not named posterDeck / noopener)', () => {
  const openSpy = jest.spyOn(window, 'open').mockReturnValue({
    opener: null,
    focus: jest.fn(),
  } as unknown as Window);

  render(<HomePage />);
  fireEvent.click(screen.getByTestId('import-file'));

  expect(openSpy).toHaveBeenCalled();
  const [url, target, features] = openSpy.mock.calls[0];
  expect(String(url)).toContain('/deck?focusImport=1');
  expect(target).toBe('_blank');
  expect(String(features)).toContain('width=1280');
  expect(String(features)).not.toMatch(/noopener/);
  expect(String(features)).not.toMatch(/noreferrer/);
  expect(target).not.toBe('posterDeck');
  expect(screen.getByRole('heading', { level: 1, name: 'Poster' })).toBeInTheDocument();
});

test('REQ-008: Library Open uses POPUP_FEATURES without noopener (Electron did-create-window)', async () => {
  const openSpy = jest.spyOn(window, 'open').mockReturnValue({
    opener: null,
    focus: jest.fn(),
  } as unknown as Window);

  jest.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/library/settings')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ libraryRoot: '/tmp/poster' }),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: async () => [
        {
          id: 'lib-deck-1',
          title: 'Library hydrate deck',
          date: '2026-01-01',
          location: 'Hall',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    } as Response);
  });

  render(<HomePage />);
  await waitFor(() => expect(screen.getByTestId('library-open-btn')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('library-open-btn'));

  expect(openSpy).toHaveBeenCalled();
  const [url, target, features] = openSpy.mock.calls[0];
  expect(String(url)).toContain('/deck?open=lib-deck-1');
  expect(target).toBe('_blank');
  expect(String(features)).toContain('width=1280');
  expect(String(features)).not.toMatch(/noopener/);
  expect(String(features)).not.toMatch(/noreferrer/);
  expect(screen.getByRole('heading', { level: 1, name: 'Poster' })).toBeInTheDocument();
});


test('REQ-007: library save notification refreshes Home list in place without reload', async () => {
  let libraryFetchCount = 0;
  const fetchMock = jest.fn((input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    if (url.includes('/library/settings')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ libraryRoot: '/tmp/poster' }),
      } as Response);
    }
    libraryFetchCount += 1;
    return Promise.resolve({
      ok: true,
      json: async () =>
        libraryFetchCount === 1
          ? []
          : [
              {
                id: 'saved-1',
                title: 'Saved deck',
                date: '2026-01-01',
                location: 'Hall',
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
    } as Response);
  });
  jest.spyOn(global, 'fetch').mockImplementation(fetchMock);

  render(<HomePage />);
  await waitFor(() => expect(screen.getByTestId('library-empty')).toBeInTheDocument());
  expect(libraryFetchCount).toBe(1);

  act(() => {
    notifyLibraryChanged();
  });

  await waitFor(() => expect(screen.getByTestId('library-entry')).toBeInTheDocument());
  expect(screen.getByText('Saved deck')).toBeInTheDocument();
  expect(libraryFetchCount).toBe(2);
});

test('Home theme dropdown restores after remount (restart / Home reopen)', async () => {
  applyTheme('dracula');
  const first = render(<HomePage />);
  await waitFor(() => expect(screen.getByLabelText('Select theme')).toHaveValue('dracula'));
  first.unmount();

  delete document.documentElement.dataset.theme;
  render(<HomePage />);
  await waitFor(() => expect(screen.getByLabelText('Select theme')).toHaveValue('dracula'));
  expect(document.documentElement.dataset.theme).toBe('dracula');
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dracula');
});

test('choosing a theme on Home persists for later reopen', async () => {
  render(<HomePage />);
  await waitFor(() => expect(screen.getByLabelText('Select theme')).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Select theme'), { target: { value: 'tokyo-night' } });
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('tokyo-night');
  expect(document.documentElement.dataset.theme).toBe('tokyo-night');
});

describe('Home Change... library root', () => {
  const settingsOk = (libraryRoot: string) =>
    Promise.resolve({
      ok: true,
      json: async () => ({ libraryRoot }),
    } as Response);

  const fetchWithSettingsPost = (chosenRoot: string) => {
    return jest.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url.includes('/library/settings') && init && init.method === 'POST') {
        return settingsOk(chosenRoot);
      }
      if (url.includes('/library/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });
  };

  beforeEach(() => {
    delete (window as typeof window & { poster?: unknown }).poster;
  });

  afterEach(() => {
    delete (window as typeof window & { poster?: unknown }).poster;
  });

  test('uses the native folder picker when window.poster is present (not window.prompt)', async () => {
    const pickLibraryFolder = jest.fn().mockResolvedValue('/picked/library');
    const togglePoster = (window as {
      poster?: { pickLibraryFolder: jest.Mock };
    });
    togglePoster.poster = { pickLibraryFolder };
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue(null);
    jest.spyOn(global, 'fetch').mockImplementation(fetchWithSettingsPost('/picked/library'));

    render(<HomePage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /change/i }));

    await waitFor(() => expect(pickLibraryFolder).toHaveBeenCalledTimes(1));
    expect(promptSpy).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText(/\/picked\/library/)).toBeInTheDocument(),
    );
    promptSpy.mockRestore();
  });

  test('native Change... posts the chosen root and refreshes the Home library in place', async () => {
    const pickLibraryFolder = jest.fn().mockResolvedValue('/picked/library');
    const togglePoster = (window as {
      poster?: { pickLibraryFolder: jest.Mock };
    });
    togglePoster.poster = { pickLibraryFolder };
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue(null);
    let libraryFetchCount = 0;
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url.includes('/library/settings') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ libraryRoot: '/picked/library' }),
        } as Response);
      }
      if (url.includes('/library/settings')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ libraryRoot: '/default/library' }),
        } as Response);
      }
      libraryFetchCount += 1;
      return Promise.resolve({
        ok: true,
        json: async () =>
          libraryFetchCount === 1
            ? [
                {
                  id: 'old-library',
                  title: 'Default library deck',
                  date: '2026-01-01',
                  location: 'Default Hall',
                  created_at: '2026-01-01T00:00:00Z',
                },
              ]
            : [
                {
                  id: 'new-library',
                  title: 'Re-pointed library deck',
                  date: '2026-01-02',
                  location: 'New Hall',
                  created_at: '2026-01-02T00:00:00Z',
                },
              ],
      } as Response);
    });
    jest.spyOn(global, 'fetch').mockImplementation(fetchMock);

    render(<HomePage />);
    await waitFor(() => expect(screen.getByText(/Library folder: \/default\/library/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Default library deck')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /change/i }));

    await waitFor(() => expect(pickLibraryFolder).toHaveBeenCalledTimes(1));
    expect(promptSpy).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/library/settings?_data=routes%2Flibrary.settings'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ libraryRoot: '/picked/library' }),
        }),
      ),
    );
    await waitFor(() => expect(screen.getByText(/Library folder: \/picked\/library/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Re-pointed library deck')).toBeInTheDocument());
    expect(screen.queryByText('Default library deck')).not.toBeInTheDocument();
    promptSpy.mockRestore();
  });

  test('falls back to window.prompt when window.poster is absent (browser)', async () => {
    const promptSpy = jest
      .spyOn(window, 'prompt')
      .mockReturnValue('/typed/library');
    jest.spyOn(global, 'fetch').mockImplementation(fetchWithSettingsPost('/typed/library'));

    render(<HomePage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /change/i }));

    await waitFor(() => expect(promptSpy).toHaveBeenCalledTimes(1));
    expect(promptSpy).toHaveBeenCalledWith('Library folder', expect.any(String));
    await waitFor(() =>
      expect(screen.getByText(/\/typed\/library/)).toBeInTheDocument(),
    );
    promptSpy.mockRestore();
  });
});
