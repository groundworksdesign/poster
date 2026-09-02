import {
  createDeckSession,
  resetTestSessionHub,
  type DeckSession,
} from './SessionTransport';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { installTestSessionBackend } = require('./testSessionBackend.js') as {
  installTestSessionBackend: () => void;
};

/** Ensure Jest uses the in-memory graph (never HTTP / native require in the app bundle). */
export function ensureTestSessionBackend(): void {
  installTestSessionBackend();
}

export async function setupDeckPresentPair(): Promise<{
  deck: DeckSession;
  sessionId: string;
  presentId: string;
}> {
  ensureTestSessionBackend();
  resetTestSessionHub();
  const deck = await createDeckSession();
  const { sessionId, presentId } = await deck.spawnPresent();
  return { deck, sessionId, presentId };
}

export function setPresentationSearch(sessionId: string, presentId: string): void {
  const search = `?sessionId=${encodeURIComponent(sessionId)}&presentId=${encodeURIComponent(presentId)}`;
  window.history.replaceState({}, '', `/presentation${search}`);
}

export { resetTestSessionHub };
