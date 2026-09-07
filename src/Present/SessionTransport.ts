import type { ProgramThumbnailState } from './programThumbnail';

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

export type { ProgramThumbnailState };

export type PresentEvent =
  | { type: 'ready'; sessionId: string; presentId: string }
  | { type: 'closed' }
  | { type: 'program-state'; program: ProgramThumbnailState | null };

export type DeckEvent =
  | { type: 'child-ready'; presentId: string }
  | { type: 'child-closed'; presentId: string }
  | {
      type: 'program-thumbnail';
      presentId: string;
      program: ProgramThumbnailState | null;
    };

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
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`poster API ${url} failed: ${res.status}`);
  }
  return res.json();
}

export type DeckSession = {
  peerId: string;
  sessionId: string;
  send: (payload: unknown, target?: string | 'all') => Promise<void>;
  spawnPresent: () => Promise<{ sessionId: string; presentId: string; url: string }>;
  closePresent: (presentId: string) => Promise<void>;
  listPresents: () => Promise<string[]>;
  onDeckEvent: (handler: (event: DeckEvent) => void) => () => void;
  dispose: () => void;
};

export type PresentSession = {
  peerId: string;
  onPresentPush: (handler: (payload: unknown) => void) => () => void;
  /** Report what is on program to Main (directed present-event → owning deck). */
  reportProgramState: (program: ProgramThumbnailState | null) => void;
  dispose: () => void;
};

/** Optional in-memory backend for Jest (injected; never require() native modules here). */
export type TestSessionBackend = {
  createDeckSession: () => Promise<DeckSession>;
  createPresentSession: (sessionId: string, presentId: string) => Promise<PresentSession>;
  reset: () => void;
};

let testBackend: TestSessionBackend | null = null;

export function setTestSessionBackend(backend: TestSessionBackend | null): void {
  testBackend = backend;
}

export function resetTestSessionHub(): void {
  testBackend?.reset();
}

function subscribePresentPushHttp(peerId: string, handler: (payload: unknown) => void): () => void {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const res = await fetch(`/api/poster/poll?peerId=${encodeURIComponent(peerId)}`);
      const data = (await res.json()) as {
        messages?: Array<{ channel: string; payload: unknown }>;
      };
      for (const msg of data.messages || []) {
        if (msg.channel === CHANNEL_PRESENT_PUSH) {
          handler(msg.payload);
        }
      }
    } catch {
      // ignore transient poll errors
    }
    if (!stopped) {
      setTimeout(tick, 100);
    }
  };
  tick();
  return () => {
    stopped = true;
  };
}

function subscribeDeckEventsHttp(peerId: string, handler: (event: DeckEvent) => void): () => void {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const res = await fetch(`/api/poster/poll?peerId=${encodeURIComponent(peerId)}`);
      const data = (await res.json()) as {
        messages?: Array<{ channel: string; payload: unknown }>;
      };
      for (const msg of data.messages || []) {
        if (msg.channel === CHANNEL_DECK_EVENT) {
          handler(msg.payload as DeckEvent);
        }
      }
    } catch {
      // ignore
    }
    if (!stopped) {
      setTimeout(tick, 100);
    }
  };
  tick();
  return () => {
    stopped = true;
  };
}

async function deckCommandElectron(command: DeckCommand): Promise<unknown> {
  if (!window.poster) throw new Error('poster bridge missing');
  return window.poster.deckCommand(command);
}

async function deckCommandHttp(peerId: string, command: DeckCommand): Promise<unknown> {
  return postJson('/api/poster/deck-command', { peerId, command });
}

export async function createDeckSession(): Promise<DeckSession> {
  if (testBackend) {
    return testBackend.createDeckSession();
  }

  if (typeof window !== 'undefined' && window.poster) {
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
      closePresent: async (presentId) => {
        await deckCommandElectron({ type: 'close', presentId });
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
  let unsub: (() => void) | undefined;
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
    closePresent: async (presentId) => {
      await deckCommandHttp(peerId, { type: 'close', presentId });
    },
    listPresents: async () => {
      const result = (await deckCommandHttp(peerId, { type: 'list' })) as { presents: string[] };
      return result.presents ?? [];
    },
    onDeckEvent: (handler) => {
      unsub?.();
      unsub = subscribeDeckEventsHttp(peerId, handler);
      return () => {
        unsub?.();
        unsub = undefined;
      };
    },
    dispose: () => {
      unsub?.();
    },
  };
}

export async function createPresentSession(
  sessionId: string,
  presentId: string,
): Promise<PresentSession> {
  if (testBackend) {
    return testBackend.createPresentSession(sessionId, presentId);
  }

  if (typeof window !== 'undefined' && window.poster) {
    window.poster.presentEvent({ type: 'ready', sessionId, presentId });
    return {
      peerId: genPeerId(),
      onPresentPush: (handler) => window.poster!.onPresentPush(handler),
      reportProgramState: (program) => {
        window.poster!.presentEvent({ type: 'program-state', program });
      },
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
  let unsub: (() => void) | undefined;
  return {
    peerId,
    onPresentPush: (handler) => {
      unsub?.();
      unsub = subscribePresentPushHttp(peerId, handler);
      return () => {
        unsub?.();
        unsub = undefined;
      };
    },
    reportProgramState: (program) => {
      void postJson('/api/poster/present-event', {
        peerId,
        event: { type: 'program-state', program },
      });
    },
    dispose: () => {
      const body = JSON.stringify({ peerId, event: { type: 'closed' } });
      // A normal fetch can be cancelled while a browser window is closing.
      // Keep the close notification alive so the deck cannot retain a stale child.
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const accepted = navigator.sendBeacon(
          '/api/poster/present-event',
          new Blob([body], { type: 'application/json' }),
        );
        if (!accepted) {
          void fetch('/api/poster/present-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body,
            keepalive: true,
          });
        }
      } else {
        void fetch('/api/poster/present-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body,
          keepalive: true,
        });
      }
      unsub?.();
    },
  };
}
