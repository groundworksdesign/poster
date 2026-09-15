/** Broadcast + in-tab signal when the presentation library changes (save/delete/restore). */
export const LIBRARY_REFRESH_CHANNEL = 'poster-library';
export const LIBRARY_REFRESH_MESSAGE = 'library-changed';
export const LIBRARY_REFRESH_STORAGE_KEY = 'poster-library-refresh-ts';

const localListeners = new Set<() => void>();

function dispatchLocal(): void {
  localListeners.forEach(fn => fn());
}

/** Notify Home (and other tabs) that library entries changed. Does not focus or reload windows. */
export function notifyLibraryChanged(): void {
  let notifiedViaChannel = false;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(LIBRARY_REFRESH_CHANNEL);
      ch.postMessage({ type: LIBRARY_REFRESH_MESSAGE, ts: Date.now() });
      ch.close();
      notifiedViaChannel = true;
    }
  } catch {
    /* BroadcastChannel unavailable */
  }

  if (!notifiedViaChannel) {
    dispatchLocal();
  }

  try {
    localStorage.setItem(LIBRARY_REFRESH_STORAGE_KEY, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
}

/** Subscribe to library change notifications (same tab, other tabs, other windows). */
export function subscribeLibraryChanged(onRefresh: () => void): () => void {
  localListeners.add(onRefresh);

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel(LIBRARY_REFRESH_CHANNEL);
    bc.onmessage = (event: MessageEvent) => {
      if (event.data?.type === LIBRARY_REFRESH_MESSAGE) onRefresh();
    };
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === LIBRARY_REFRESH_STORAGE_KEY) onRefresh();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    localListeners.delete(onRefresh);
    bc?.close();
    window.removeEventListener('storage', onStorage);
  };
}
