import {
  createDeckSession,
  resetTestSessionHub,
  type DeckSession,
} from './SessionTransport';

export async function setupDeckPresentPair(): Promise<{
  deck: DeckSession;
  sessionId: string;
  presentId: string;
}> {
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
