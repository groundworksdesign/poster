import React, { useEffect, useState, useCallback } from 'react';

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

export default function LibraryPanel({ onOpen, onDeleted, currentLibraryId, refreshKey = 0 }: LibraryPanelProps) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div data-testid="library-panel" style={{ marginTop: '12px', padding: '8px', border: '1px solid #aaa', background: '#f9f9f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <strong>Saved Presentations</strong>
        <button onClick={fetchEntries} disabled={loading} style={{ fontSize: '11px' }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '8px' }}>{error}</div>}

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
