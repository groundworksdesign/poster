import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from './HomePage';
import { notifyLibraryChanged } from './utils/libraryRefresh';
import { THEME_STORAGE_KEY, applyTheme } from './utils/useTheme';

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
