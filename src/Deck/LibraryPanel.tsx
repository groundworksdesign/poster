import React, { useEffect, useRef, useState, useCallback } from 'react';

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
      const res = await fetch('/library');
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
      const res = await fetch(`/library/delete/${entry.id}`, { method: 'DELETE' });
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
      const res = await fetch(`/library/open/${entry.id}`);
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
      const res = await fetch('/library/restore', { method: 'POST', body: formData });
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
    <div data-testid="library-panel" style={{ marginTop: '12px', padding: '8px', border: '1px solid #aaa', background: '#f9f9f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <strong>Saved Presentations</strong>
        <button onClick={fetchEntries} disabled={loading} style={{ fontSize: '11px' }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '8px' }}>{error}</div>}
      {exportError && (
        <div style={{ color: '#c00', marginBottom: '8px', fontSize: '12px' }}>
          {exportError.message}
        </div>
      )}
      {restoreStatus && (
        <div
          data-testid="restore-status"
          style={{ color: restoreStatus.type === 'error' ? '#c00' : '#060', marginBottom: '8px', fontSize: '12px' }}
        >
          {restoreStatus.message}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
        <a
          data-testid="library-backup-btn"
          href="/library/backup"
          download="poster.sqlite"
          style={{ fontSize: '11px', padding: '2px 6px', border: '1px solid #aaa', borderRadius: '3px', textDecoration: 'none', color: 'inherit', background: '#fff' }}
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
          style={{ fontSize: '11px' }}
        >
          {restoring ? 'Restoring...' : 'Restore Database'}
        </button>
      </div>

      {!loading && entries.length === 0 && !error && (
        <div data-testid="library-empty">No saved presentations.</div>
      )}

      {entries.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Title</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Location</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Saved</th>
              <th style={{ padding: '4px 8px', borderBottom: '1px solid #ccc' }}></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr
                key={entry.id}
                data-testid="library-entry"
                className={entry.id === currentLibraryId ? 'library-current' : undefined}
                style={entry.id === currentLibraryId ? { background: '#e8f4e8' } : undefined}
              >
                <td style={{ padding: '4px 8px' }}>{entry.title || '(untitled)'}</td>
                <td style={{ padding: '4px 8px' }}>{entry.date || ''}</td>
                <td style={{ padding: '4px 8px' }}>{entry.location || ''}</td>
                <td style={{ padding: '4px 8px' }}>
                  {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}
                </td>
                <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
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
                    onClick={() => handleDelete(entry)}
                    style={{ color: '#c00' }}
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
