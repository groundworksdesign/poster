export const CHANNEL_DECK_COMMAND = 'poster:deck-command';
export const CHANNEL_PRESENT_PUSH = 'poster:present-push';
export const CHANNEL_PRESENT_EVENT = 'poster:present-event';
export const CHANNEL_DECK_EVENT = 'poster:deck-event';

export type DeckCommand =
  | { type: 'register' }
  | { type: 'spawn' }
  | { type: 'send'; payload: unknown; target?: string | 'all' }
  | { type: 'list' }
  | { type: 'close'; presentId: string };

export type PresentEvent =
  | { type: 'ready'; sessionId: string; presentId: string }
  | { type: 'closed' };

export type DeckEvent =
  | { type: 'child-ready'; presentId: string }
  | { type: 'child-closed'; presentId: string };

declare global {
  interface Window {
    poster?: {
      deckCommand: (command: DeckCommand) => Promise<unknown>;
      presentEvent: (event: PresentEvent) => void;
      onDeckEvent: (handler: (payload: DeckEvent) => void) => () => void;
      onPresentPush: (handler: (payload: unknown) => void) => () => void;
    };
  }
}

function genPeerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export type DeckSession = {
  peerId: string;
  sessionId: string;
  send: (payload: unknown, target?: string | 'all') => Promise<void>;
  spawnPresent: () => Promise<{ sessionId: string; presentId: string; url: string }>;
  listPresents: () => Promise<string[]>;
  onDeckEvent: (handler: (event: DeckEvent) => void) => () => void;
  dispose: () => void;
};

export type PresentSession = {
  peerId: string;
  onPresentPush: (handler: (payload: unknown) => void) => () => void;
  dispose: () => void;
};

/** In-memory hub for unit tests (same JS realm). */
type TestHubPeer = {
  role: 'deck' | 'present';
  onDeckEvent?: (payload: DeckEvent) => void;
  onPresentPush?: (payload: unknown) => void;
};

const testHub: {
  graph: import('../../shared/posterSessionGraph.cjs').PosterSessionGraph | null;
  peers: Map<string, TestHubPeer>;
} = {
  graph: null,
  peers: new Map(),
};

function getTestGraph() {
  if (!testHub.graph) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PosterSessionGraph } = require('../../shared/posterSessionGraph.cjs');
    testHub.graph = new PosterSessionGraph();
    testHub.peers.clear();
  }
  return testHub.graph;
}

export function resetTestSessionHub(): void {
  testHub.graph = null;
  testHub.peers.clear();
}

function useTestHub(): boolean {
  return process.env.NODE_ENV === 'test';
}

async function deckCommandElectron(command: DeckCommand): Promise<unknown> {
  if (!window.poster) throw new Error('poster bridge missing');
  return window.poster.deckCommand(command);
}

async function deckCommandHttp(peerId: string, command: DeckCommand): Promise<unknown> {
  return postJson('/api/poster/deck-command', { peerId, command });
}

function subscribeDeckEventsHttp(peerId: string, handler: (event: DeckEvent) => void): () => void {
  const es = new EventSource(`/api/poster/stream/deck?peerId=${encodeURIComponent(peerId)}`);
  es.onmessage = (msg) => {
    try {
      const parsed = JSON.parse(msg.data);
      if (parsed.channel === CHANNEL_DECK_EVENT) {
        handler(parsed.payload as DeckEvent);
      }
    } catch {
      // ignore malformed
    }
  };
  return () => es.close();
}

function subscribePresentPushHttp(peerId: string, handler: (payload: unknown) => void): () => void {
  const es = new EventSource(`/api/poster/stream/present?peerId=${encodeURIComponent(peerId)}`);
  es.onmessage = (msg) => {
    try {
      const parsed = JSON.parse(msg.data);
      if (parsed.channel === CHANNEL_PRESENT_PUSH) {
        handler(parsed.payload);
      }
    } catch {
      // ignore malformed
    }
  };
  return () => es.close();
}

export async function createDeckSession(): Promise<DeckSession> {
  if (useTestHub()) {
    const peerId = genPeerId();
    const graph = getTestGraph();
    const reg = graph.registerDeck(peerId, (channel, payload) => {
      const peer = testHub.peers.get(peerId);
      if (channel === CHANNEL_DECK_EVENT && peer?.onDeckEvent) {
        peer.onDeckEvent(payload as DeckEvent);
      }
    });
    testHub.peers.set(peerId, { role: 'deck' });
    return {
      peerId,
      sessionId: reg.sessionId,
      send: async (payload, target) => {
        graph.handleDeckCommand(peerId, { type: 'send', payload, target: target ?? 'all' });
      },
      spawnPresent: async () => {
        const result = graph.handleDeckCommand(peerId, { type: 'spawn' }) as {
          ok: boolean;
          sessionId: string;
          presentId: string;
        };
        const url = `/presentation?sessionId=${encodeURIComponent(result.sessionId)}&presentId=${encodeURIComponent(result.presentId)}`;
        return { sessionId: result.sessionId, presentId: result.presentId, url };
      },
      listPresents: async () => {
        const result = graph.handleDeckCommand(peerId, { type: 'list' }) as {
          presents: string[];
        };
        return result.presents ?? [];
      },
      onDeckEvent: (handler) => {
        const peer = testHub.peers.get(peerId);
        if (peer) peer.onDeckEvent = handler;
        return () => {
          const p = testHub.peers.get(peerId);
          if (p) p.onDeckEvent = undefined;
        };
      },
      dispose: () => {
        graph.unregister(peerId);
        testHub.peers.delete(peerId);
      },
    };
  }

  if (window.poster) {
    const reg = (await deckCommandElectron({ type: 'register' })) as {
      sessionId: string;
      peerId?: string;
    };
    const peerId = reg.peerId ?? genPeerId();
    const sessionId = reg.sessionId;
    const unsub = window.poster.onDeckEvent(() => {});
    return {
      peerId,
      sessionId,
      send: async (payload, target) => {
        await deckCommandElectron({ type: 'send', payload, target: target ?? 'all' });
      },
      spawnPresent: async () => {
        const result = (await deckCommandElectron({ type: 'spawn' })) as {
          sessionId: string;
          presentId: string;
        };
        const url = `/presentation?sessionId=${encodeURIComponent(result.sessionId)}&presentId=${encodeURIComponent(result.presentId)}`;
        return { sessionId: result.sessionId, presentId: result.presentId, url };
      },
      listPresents: async () => {
        const result = (await deckCommandElectron({ type: 'list' })) as { presents: string[] };
        return result.presents ?? [];
      },
      onDeckEvent: (handler) => window.poster!.onDeckEvent(handler),
      dispose: () => {
        unsub();
      },
    };
  }

  const peerId = genPeerId();
  const reg = (await deckCommandHttp(peerId, { type: 'register' })) as { sessionId: string };
  const unsub = subscribeDeckEventsHttp(peerId, () => {});
  return {
    peerId,
    sessionId: reg.sessionId,
    send: async (payload, target) => {
      await deckCommandHttp(peerId, { type: 'send', payload, target: target ?? 'all' });
    },
    spawnPresent: async () => {
      const result = (await deckCommandHttp(peerId, { type: 'spawn' })) as {
        sessionId: string;
        presentId: string;
      };
      const url = `/presentation?sessionId=${encodeURIComponent(result.sessionId)}&presentId=${encodeURIComponent(result.presentId)}`;
      return { sessionId: result.sessionId, presentId: result.presentId, url };
    },
    listPresents: async () => {
      const result = (await deckCommandHttp(peerId, { type: 'list' })) as { presents: string[] };
      return result.presents ?? [];
    },
    onDeckEvent: (handler) => subscribeDeckEventsHttp(peerId, handler),
    dispose: () => {
      unsub();
    },
  };
}

export async function createPresentSession(
  sessionId: string,
  presentId: string,
): Promise<PresentSession> {
  if (useTestHub()) {
    const peerId = genPeerId();
    const graph = getTestGraph();
    testHub.peers.set(peerId, { role: 'present' });
    graph.handlePresentEvent(
      peerId,
      { type: 'ready', sessionId, presentId },
      (channel, payload) => {
        const peer = testHub.peers.get(peerId);
        if (channel === CHANNEL_PRESENT_PUSH && peer?.onPresentPush) {
          peer.onPresentPush(payload);
        }
      },
    );
    return {
      peerId,
      onPresentPush: (handler) => {
        const peer = testHub.peers.get(peerId);
        if (peer) peer.onPresentPush = handler;
        return () => {
          const p = testHub.peers.get(peerId);
          if (p) p.onPresentPush = undefined;
        };
      },
      dispose: () => {
        graph.handlePresentEvent(peerId, { type: 'closed' }, () => {});
        testHub.peers.delete(peerId);
      },
    };
  }

  if (window.poster) {
    window.poster.presentEvent({ type: 'ready', sessionId, presentId });
    return {
      peerId: genPeerId(),
      onPresentPush: (handler) => window.poster!.onPresentPush(handler),
      dispose: () => {
        window.poster!.presentEvent({ type: 'closed' });
      },
    };
  }

  const peerId = genPeerId();
  await postJson('/api/poster/present-event', {
    peerId,
    event: { type: 'ready', sessionId, presentId },
  });
  const unsub = subscribePresentPushHttp(peerId, () => {});
  return {
    peerId,
    onPresentPush: (handler) => subscribePresentPushHttp(peerId, handler),
    dispose: () => {
      postJson('/api/poster/present-event', { peerId, event: { type: 'closed' } });
      unsub();
    },
  };
}
