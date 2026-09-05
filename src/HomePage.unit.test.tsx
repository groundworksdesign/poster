import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { notifyLibraryChanged } from './utils/libraryRefresh';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

import HomePage from './HomePage';

test('deck builder link opens a new window without same-tab navigation', () => {
  const openSpy = jest.spyOn(window, 'open').mockReturnValue({ focus: jest.fn(), opener: null } as any);
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

test('presentation link opens a new window without same-tab navigation', () => {
  const openSpy = jest.spyOn(window, 'open').mockReturnValue({ focus: jest.fn(), opener: null } as any);
  render(<HomePage />);
  const link = screen.getByRole('link', { name: /open presentation/i });
  fireEvent.click(link);
  expect(openSpy).toHaveBeenCalledWith(
    expect.stringContaining('/presentation'),
    'posterPresentation',
    expect.any(String),
  );
  openSpy.mockRestore();
});

test('REQ-007: library save notification refreshes Home list in place without reload', async () => {
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'saved-1', title: 'Saved deck', date: '2026-01-01', location: 'Hall', created_at: '2026-01-01T00:00:00Z' },
      ],
    } as Response);
  jest.spyOn(global, 'fetch').mockImplementation(fetchMock);

  render(<HomePage />);
  await waitFor(() => expect(screen.getByTestId('library-empty')).toBeInTheDocument());
  expect(fetchMock).toHaveBeenCalledTimes(1);

  act(() => {
    notifyLibraryChanged();
  });

  await waitFor(() => expect(screen.getByTestId('library-entry')).toBeInTheDocument());
  expect(screen.getByText('Saved deck')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
