import React, { useEffect, useRef, useState, useCallback } from 'react';
import { remixDataUrl, REMIX_ROUTE_ID } from '../remixDataUrl';

export type LibraryEntry = {
  id: string;
  title: string;
  date: string;
  location: string;
  created_at: string;
};

interface LibraryPanelProps {
  onOpen: (id: string) => void;
  onDeleted?: (id: string) => void;
  currentLibraryId: string | null;
  refreshKey?: number;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'deck';
}

export default function LibraryPanel({ onOpen, onDeleted, currentLibraryId, refreshKey = 0 }: LibraryPanelProps) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportError, setExportError] = useState<{ id: string; message: string } | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(remixDataUrl('/library', REMIX_ROUTE_ID.library));
      if (!res.ok) {
        setError(`Failed to load library (${res.status})`);
        return;
      }
      const data: LibraryEntry[] = await res.json();
      setEntries(data);
    } catch (e) {
      setError('Network error loading library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries, refreshKey]);

  const handleDelete = async (entry: LibraryEntry) => {
    if (!window.confirm(`Delete "${entry.title || 'this presentation'}"?`)) return;
    try {
      const res = await fetch(
        remixDataUrl(`/library/delete/${entry.id}`, REMIX_ROUTE_ID.libraryDelete),
        { method: 'DELETE' },
      );
      if (!res.ok) {
        alert(`Delete failed (${res.status})`);
        return;
      }
      onDeleted?.(entry.id);
      await fetchEntries();
    } catch {
      alert('Network error during delete.');
    }
  };

  const handleExport = async (entry: LibraryEntry) => {
    setExportError(null);
    try {
      const res = await fetch(remixDataUrl(`/library/open/${entry.id}`, REMIX_ROUTE_ID.libraryOpen));
      if (!res.ok) {
        setExportError({ id: entry.id, message: `Export failed (${res.status})` });
        return;
      }
      const data: unknown = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = entry.title ? `${slugify(entry.title)}.json` : `deck-${entry.id}.json`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setExportError({ id: entry.id, message: `Export failed for "${entry.title || entry.id}"` });
    }
  };

  const handleRestore = async (file: File) => {
    if (!window.confirm(`Restore database from "${file.name}"? This will replace your current library. Continue?`)) return;
    setRestoring(true);
    setRestoreStatus(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(remixDataUrl('/library/restore', REMIX_ROUTE_ID.libraryRestore), {
        method: 'POST',
        body: formData,
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setRestoreStatus({ type: 'error', message: data.error ?? `Restore failed (${res.status})` });
        return;
      }
      setRestoreStatus({ type: 'success', message: 'Database restored successfully.' });
      await fetchEntries();
    } catch {
      setRestoreStatus({ type: 'error', message: 'Network error during restore.' });
    } finally {
      setRestoring(false);
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  };

  return (
    <div data-testid="library-panel" className="library-panel">
      <div className="library-panel-toolbar">
        <strong>Saved Presentations</strong>
        <button onClick={fetchEntries} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="library-panel-error">{error}</div>}
      {exportError && (
        <div className="library-panel-error" style={{ fontSize: '12px' }}>
          {exportError.message}
        </div>
      )}
      {restoreStatus && (
        <div
          data-testid="restore-status"
          className={restoreStatus.type === 'error' ? 'library-panel-error' : 'library-panel-success'}
        >
          {restoreStatus.message}
        </div>
      )}

      <div className="library-panel-actions">
        <a
          data-testid="library-backup-btn"
          href="/library/backup"
          download="poster.sqlite"
          className="library-backup-link"
        >
          Backup Database
        </a>
        <input
          ref={restoreInputRef}
          data-testid="library-restore-input"
          type="file"
          accept=".sqlite"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleRestore(file);
          }}
        />
        <button
          data-testid="library-restore-btn"
          onClick={() => restoreInputRef.current?.click()}
          disabled={restoring}
        >
          {restoring ? 'Restoring...' : 'Restore Database'}
        </button>
      </div>

      {!loading && entries.length === 0 && !error && (
        <div data-testid="library-empty" className="library-panel-empty">No saved presentations.</div>
      )}

      {entries.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Location</th>
              <th>Saved</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr
                key={entry.id}
                data-testid="library-entry"
                className={entry.id === currentLibraryId ? 'library-current' : undefined}
              >
                <td>{entry.title || '(untitled)'}</td>
                <td>{entry.date || ''}</td>
                <td>{entry.location || ''}</td>
                <td>
                  {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    data-testid="library-open-btn"
                    onClick={() => onOpen(entry.id)}
                    style={{ marginRight: '4px' }}
                  >
                    Open
                  </button>
                  <button
                    data-testid="library-export-btn"
                    onClick={() => handleExport(entry)}
                    style={{ marginRight: '4px' }}
                  >
                    Export
                  </button>
                  <button
                    data-testid="library-delete-btn"
                    className="library-delete-btn"
                    onClick={() => handleDelete(entry)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
