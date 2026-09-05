'use strict';

/**
 * Jest-only in-memory session backend. Injected into SessionTransport so the
 * browser bundle never require()s shared/*.cjs.
 */
const { PosterSessionGraph } = require('../../shared/posterSessionGraph.cjs');
const {
  setTestSessionBackend,
  CHANNEL_DECK_EVENT,
  CHANNEL_PRESENT_PUSH,
} = require('../Present/SessionTransport');

function genPeerId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function installTestSessionBackend() {
  let graph = new PosterSessionGraph();
  /** @type {Map<string, any>} */
  const peers = new Map();

  const backend = {
    reset() {
      graph = new PosterSessionGraph();
      peers.clear();
    },
    async createDeckSession() {
      const peerId = genPeerId();
      const reg = graph.registerDeck(peerId, (channel, payload) => {
        const peer = peers.get(peerId);
        if (channel === CHANNEL_DECK_EVENT && peer?.onDeckEvent) {
          peer.onDeckEvent(payload);
        }
      });
      peers.set(peerId, { role: 'deck' });
      return {
        peerId,
        sessionId: reg.sessionId,
        send: async (payload, target) => {
          graph.handleDeckCommand(peerId, { type: 'send', payload, target: target ?? 'all' });
        },
        spawnPresent: async () => {
          const result = graph.handleDeckCommand(peerId, { type: 'spawn' });
          const url = `/presentation?sessionId=${encodeURIComponent(result.sessionId)}&presentId=${encodeURIComponent(result.presentId)}`;
          return { sessionId: result.sessionId, presentId: result.presentId, url };
        },
        closePresent: async (presentId) => {
          graph.handleDeckCommand(peerId, { type: 'close', presentId });
        },
        listPresents: async () => {
          const result = graph.handleDeckCommand(peerId, { type: 'list' });
          return result.presents ?? [];
        },
        onDeckEvent: (handler) => {
          const peer = peers.get(peerId);
          if (peer) peer.onDeckEvent = handler;
          return () => {
            const p = peers.get(peerId);
            if (p) p.onDeckEvent = undefined;
          };
        },
        dispose: () => {
          graph.unregister(peerId);
          peers.delete(peerId);
        },
      };
    },
    async createPresentSession(sessionId, presentId) {
      const peerId = genPeerId();
      peers.set(peerId, { role: 'present', pendingPushes: [] });
      graph.handlePresentEvent(
        peerId,
        { type: 'ready', sessionId, presentId },
        (channel, payload) => {
          const peer = peers.get(peerId);
          if (!peer || channel !== CHANNEL_PRESENT_PUSH) return;
          // Ready may replay cache before the client attaches onPresentPush.
          if (peer.onPresentPush) {
            peer.onPresentPush(payload);
          } else {
            peer.pendingPushes.push(payload);
          }
        },
      );
      return {
        peerId,
        onPresentPush: (handler) => {
          const peer = peers.get(peerId);
          if (peer) {
            peer.onPresentPush = handler;
            const pending = peer.pendingPushes.splice(0, peer.pendingPushes.length);
            for (const payload of pending) {
              handler(payload);
            }
          }
          return () => {
            const p = peers.get(peerId);
            if (p) p.onPresentPush = undefined;
          };
        },
        reportProgramState: (program) => {
          graph.handlePresentEvent(peerId, { type: 'program-state', program }, () => {});
        },
        dispose: () => {
          graph.handlePresentEvent(peerId, { type: 'closed' }, () => {});
          peers.delete(peerId);
        },
      };
    },
  };

  setTestSessionBackend(backend);
  return backend;
}

module.exports = { installTestSessionBackend };
