import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LibraryPanel from './LibraryPanel';

const mockEntries = [
  { id: 'id-1', title: 'Sunday Service', date: '2026-04-06', location: 'Main Hall', created_at: '2026-04-06T10:00:00.000Z' },
  { id: 'id-2', title: 'Easter Special', date: '2026-04-12', location: 'Sanctuary', created_at: '2026-04-12T09:00:00.000Z' },
];

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => mockEntries,
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders list of library entries', async () => {
  render(<LibraryPanel onOpen={jest.fn()} currentLibraryId={null} />);

  await waitFor(() => {
    expect(screen.getAllByTestId('library-entry')).toHaveLength(2);
  });

  expect(screen.getByText('Sunday Service')).toBeInTheDocument();
  expect(screen.getByText('Easter Special')).toBeInTheDocument();
});

test('calls onOpen with correct id when Open button clicked', async () => {
  const onOpen = jest.fn();
  render(<LibraryPanel onOpen={onOpen} currentLibraryId={null} />);

  await waitFor(() => {
    expect(screen.getAllByTestId('library-open-btn')).toHaveLength(2);
  });

  fireEvent.click(screen.getAllByTestId('library-open-btn')[0]);
  expect(onOpen).toHaveBeenCalledWith('id-1');
});

test('delete flow calls fetch DELETE and onDeleted', async () => {
  const onDeleted = jest.fn();
  jest.spyOn(window, 'confirm').mockReturnValue(true);

  const fetchMock = jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce({ ok: true, json: async () => mockEntries } as Response) // initial load
    .mockResolvedValueOnce({ ok: true, json: async () => ({ok: true}) } as Response) // DELETE
    .mockResolvedValueOnce({ ok: true, json: async () => [mockEntries[1]] } as Response); // re-fetch

  render(<LibraryPanel onOpen={jest.fn()} onDeleted={onDeleted} currentLibraryId={null} />);

  await waitFor(() => {
    expect(screen.getAllByTestId('library-delete-btn')).toHaveLength(2);
  });

  await act(async () => {
    fireEvent.click(screen.getAllByTestId('library-delete-btn')[0]);
  });

  expect(fetchMock).toHaveBeenCalledWith('/library/delete/id-1', { method: 'DELETE' });
  expect(onDeleted).toHaveBeenCalledWith('id-1');
});

test('highlights current library row with library-current class', async () => {
  render(<LibraryPanel onOpen={jest.fn()} currentLibraryId="id-2" />);

  await waitFor(() => {
    expect(screen.getAllByTestId('library-entry')).toHaveLength(2);
  });

  const rows = screen.getAllByTestId('library-entry');
  expect(rows[0]).not.toHaveClass('library-current');
  expect(rows[1]).toHaveClass('library-current');
});

test('shows empty state message when no entries', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  } as Response);

  render(<LibraryPanel onOpen={jest.fn()} currentLibraryId={null} />);

  await waitFor(() => {
    expect(screen.getByTestId('library-empty')).toBeInTheDocument();
  });

  expect(screen.getByText('No saved presentations.')).toBeInTheDocument();
});
