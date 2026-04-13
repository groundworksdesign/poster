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

test('renders backup link with correct href', async () => {
  render(<LibraryPanel onOpen={jest.fn()} currentLibraryId={null} />);

  await waitFor(() => {
    expect(screen.getAllByTestId('library-entry')).toHaveLength(2);
  });

  const backupLink = screen.getByTestId('library-backup-btn');
  expect(backupLink).toBeInTheDocument();
  expect(backupLink).toHaveAttribute('href', '/library/backup');
});

test('renders restore button', async () => {
  render(<LibraryPanel onOpen={jest.fn()} currentLibraryId={null} />);

  await waitFor(() => {
    expect(screen.getAllByTestId('library-entry')).toHaveLength(2);
  });

  expect(screen.getByTestId('library-restore-btn')).toBeInTheDocument();
});

test('restore flow: shows success status and refreshes list on successful restore', async () => {
  jest.spyOn(window, 'confirm').mockReturnValue(true);

  const fetchMock = jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce({ ok: true, json: async () => mockEntries } as Response) // initial load
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) } as Response) // POST /library/restore
    .mockResolvedValueOnce({ ok: true, json: async () => mockEntries } as Response); // re-fetch after restore

  render(<LibraryPanel onOpen={jest.fn()} currentLibraryId={null} />);

  await waitFor(() => {
    expect(screen.getByTestId('library-restore-btn')).toBeInTheDocument();
  });

  // Simulate file selection by directly invoking handleRestore via the hidden input
  const file = new File([Buffer.from('SQLite format 3\0' + 'x'.repeat(100))], 'backup.sqlite', { type: 'application/octet-stream' });
  const input = screen.getByTestId('library-restore-input') as HTMLInputElement;

  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });

  await waitFor(() => {
    expect(screen.getByTestId('restore-status')).toBeInTheDocument();
  });

  expect(screen.getByTestId('restore-status')).toHaveTextContent('Database restored successfully.');
  expect(fetchMock).toHaveBeenCalledWith('/library/restore', expect.objectContaining({ method: 'POST' }));
});

test('restore flow: shows error status on failed restore', async () => {
  jest.spyOn(window, 'confirm').mockReturnValue(true);

  jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce({ ok: true, json: async () => mockEntries } as Response) // initial load
    .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'File is not a valid SQLite database' }) } as Response); // failed restore

  render(<LibraryPanel onOpen={jest.fn()} currentLibraryId={null} />);

  await waitFor(() => {
    expect(screen.getByTestId('library-restore-btn')).toBeInTheDocument();
  });

  const file = new File(['not a sqlite file'], 'bad.sqlite', { type: 'application/octet-stream' });
  const input = screen.getByTestId('library-restore-input') as HTMLInputElement;

  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });

  await waitFor(() => {
    expect(screen.getByTestId('restore-status')).toBeInTheDocument();
  });

  expect(screen.getByTestId('restore-status')).toHaveTextContent('File is not a valid SQLite database');
});
