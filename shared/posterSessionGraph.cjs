'use strict';

const crypto = require('crypto');

function uuid() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Main-owned session graph for deck ↔ present routing.
 * Used by Electron main and the Express session relay (browser mode).
 */
class PosterSessionGraph {
  constructor() {
    /** @type {Map<string, { deckPeerId: string, presents: Map<string, string | null> }>} */
    this.sessions = new Map();
    /** @type {Map<string, { role: 'deck' | 'present', sessionId: string, presentId?: string, deliver: (channel: string, payload: unknown) => void }>} */
    this.peers = new Map();
    /** @type {Map<string, unknown>} */
    this.lastPayloadByPresent = new Map();
  }

  /**
   * @param {string} peerId
   * @param {(channel: string, payload: unknown) => void} deliver
   */
  registerDeck(peerId, deliver) {
    const sessionId = uuid();
    this.sessions.set(sessionId, {
      deckPeerId: peerId,
      presents: new Map(),
    });
    this.peers.set(peerId, { role: 'deck', sessionId, deliver });
    return { ok: true, sessionId };
  }

  /**
   * @param {string} peerId
   */
  unregister(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    const session = this.sessions.get(peer.sessionId);
    if (peer.role === 'deck') {
      if (session) {
        for (const presentPeerId of session.presents.values()) {
          if (presentPeerId) this.peers.delete(presentPeerId);
        }
        this.sessions.delete(peer.sessionId);
      }
    } else if (peer.role === 'present' && session && peer.presentId) {
      // Soft-unbind only if this peer still owns the presentId (avoid Strict Mode race
      // where a late closed from mount-1 clears mount-2's binding).
      if (session.presents.get(peer.presentId) === peerId) {
        session.presents.set(peer.presentId, null);
      }
    }

    this.peers.delete(peerId);
  }

  /**
   * @param {string} peerId
   * @param {{ type: string, [key: string]: unknown }} command
   */
  handleDeckCommand(peerId, command) {
    const peer = this.peers.get(peerId);
    if (!peer || peer.role !== 'deck') {
      return { ok: false, error: 'not-a-deck' };
    }
    const session = this.sessions.get(peer.sessionId);
    if (!session) {
      return { ok: false, error: 'no-session' };
    }

    switch (command.type) {
      case 'spawn': {
        const presentId = uuid();
        session.presents.set(presentId, null);
        return { ok: true, sessionId: peer.sessionId, presentId };
      }
      case 'send': {
        const payload = command.payload;
        const target = command.target;
        let presentIds;
        if (target && target !== 'all') {
          presentIds = session.presents.has(target) ? [target] : [];
        } else {
          presentIds = [...session.presents.keys()];
        }
        for (const pid of presentIds) {
          this.lastPayloadByPresent.set(pid, payload);
          const presentPeerId = session.presents.get(pid);
          if (!presentPeerId) continue;
          const presentPeer = this.peers.get(presentPeerId);
          presentPeer?.deliver('poster:present-push', payload);
        }
        return { ok: true, delivered: presentIds.length };
      }
      case 'list':
        return {
          ok: true,
          sessionId: peer.sessionId,
          presents: [...session.presents.keys()],
        };
      case 'close': {
        const presentId = command.presentId;
        if (typeof presentId !== 'string' || !session.presents.has(presentId)) {
          return { ok: false, error: 'missing-target' };
        }
        const presentPeerId = session.presents.get(presentId);
        if (presentPeerId) {
          this.peers.delete(presentPeerId);
        }
        session.presents.delete(presentId);
        this.lastPayloadByPresent.delete(presentId);
        const deckPeer = this.peers.get(session.deckPeerId);
        if (deckPeer) {
          deckPeer.deliver('poster:deck-event', {
            type: 'child-closed',
            presentId,
          });
        }
        return { ok: true };
      }
      default:
        return { ok: false, error: 'unknown-command' };
    }
  }

  /**
   * @param {string} peerId
   * @param {{ type: string, [key: string]: unknown }} event
   * @param {(channel: string, payload: unknown) => void} deliver
   */
  handlePresentEvent(peerId, event, deliver) {
    if (event.type === 'ready') {
      const sessionId = event.sessionId;
      const presentId = event.presentId;
      if (typeof sessionId !== 'string' || typeof presentId !== 'string') {
        return { ok: false, error: 'invalid-ready' };
      }
      const session = this.sessions.get(sessionId);
      if (!session || !session.presents.has(presentId)) {
        return { ok: false, error: 'invalid-present' };
      }
      session.presents.set(presentId, peerId);
      this.peers.set(peerId, {
        role: 'present',
        sessionId,
        presentId,
        deliver,
      });
      const cached = this.lastPayloadByPresent.get(presentId);
      if (cached !== undefined) {
        deliver('poster:present-push', cached);
      }
      const deckPeer = this.peers.get(session.deckPeerId);
      if (deckPeer) {
        deckPeer.deliver('poster:deck-event', { type: 'child-ready', presentId });
      }
      return { ok: true };
    }

    if (event.type === 'closed') {
      this.unregister(peerId);
      return { ok: true };
    }

    // Present reports what is on program; Main forwards only to the owning deck.
    if (event.type === 'program-state') {
      const peer = this.peers.get(peerId);
      if (!peer || peer.role !== 'present' || !peer.presentId) {
        return { ok: false, error: 'not-a-present' };
      }
      const session = this.sessions.get(peer.sessionId);
      if (!session) {
        return { ok: false, error: 'no-session' };
      }
      const deckPeer = this.peers.get(session.deckPeerId);
      if (deckPeer) {
        deckPeer.deliver('poster:deck-event', {
          type: 'program-thumbnail',
          presentId: peer.presentId,
          program: event.program ?? null,
        });
      }
      return { ok: true };
    }

    return { ok: false, error: 'unknown-event' };
  }
}

module.exports = { PosterSessionGraph, uuid };
