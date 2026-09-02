'use strict';

const { PosterSessionGraph } = require('../../shared/posterSessionGraph.cjs');

describe('PosterSessionGraph', () => {
  let graph;
  const deliveries = new Map();

  function makeDeliver(peerId) {
    return (channel, payload) => {
      if (!deliveries.has(peerId)) deliveries.set(peerId, []);
      deliveries.get(peerId).push({ channel, payload });
    };
  }

  beforeEach(() => {
    graph = new PosterSessionGraph();
    deliveries.clear();
  });

  test('deck send routes to its present child only', () => {
    const deckPeer = 'deck-1';
    const presentPeer = 'present-1';
    const reg = graph.registerDeck(deckPeer, makeDeliver(deckPeer));
    const spawn = graph.handleDeckCommand(deckPeer, { type: 'spawn' });
    graph.handlePresentEvent(
      presentPeer,
      { type: 'ready', sessionId: reg.sessionId, presentId: spawn.presentId },
      makeDeliver(presentPeer),
    );

    const payload = { slide: { type: 'general', title: 'A' } };
    graph.handleDeckCommand(deckPeer, { type: 'send', payload, target: 'all' });

    const presentMsgs = deliveries.get(presentPeer) || [];
    expect(presentMsgs.some((m) => m.channel === 'poster:present-push' && m.payload === payload)).toBe(
      true,
    );
  });

  test('replay last payload when present becomes ready', () => {
    const deckPeer = 'deck-1';
    const presentPeer = 'present-1';
    const reg = graph.registerDeck(deckPeer, makeDeliver(deckPeer));
    const spawn = graph.handleDeckCommand(deckPeer, { type: 'spawn' });
    const payload = { slide: { type: 'general', title: 'Cached' } };
    graph.handleDeckCommand(deckPeer, { type: 'send', payload, target: 'all' });

    graph.handlePresentEvent(
      presentPeer,
      { type: 'ready', sessionId: reg.sessionId, presentId: spawn.presentId },
      makeDeliver(presentPeer),
    );

    const presentMsgs = deliveries.get(presentPeer) || [];
    expect(presentMsgs.some((m) => m.payload === payload)).toBe(true);
  });
});
