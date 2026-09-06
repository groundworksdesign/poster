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

  function payloadsFor(peerId) {
    return (deliveries.get(peerId) || [])
      .filter((m) => m.channel === 'poster:present-push')
      .map((m) => m.payload);
  }

  beforeEach(() => {
    graph = new PosterSessionGraph();
    deliveries.clear();
  });

  function registerDeckWithPresents(deckPeer, presentPeers) {
    const reg = graph.registerDeck(deckPeer, makeDeliver(deckPeer));
    const presentIds = [];
    for (const presentPeer of presentPeers) {
      const spawn = graph.handleDeckCommand(deckPeer, { type: 'spawn' });
      presentIds.push(spawn.presentId);
      graph.handlePresentEvent(
        presentPeer,
        { type: 'ready', sessionId: reg.sessionId, presentId: spawn.presentId },
        makeDeliver(presentPeer),
      );
    }
    return { sessionId: reg.sessionId, presentIds };
  }

  test('deck send routes to its present child only', () => {
    const { presentIds } = registerDeckWithPresents('deck-1', ['present-1']);
    const payload = { slide: { type: 'general', title: 'A' } };
    graph.handleDeckCommand('deck-1', { type: 'send', payload, target: 'all' });
    expect(payloadsFor('present-1')).toContain(payload);
    expect(presentIds).toHaveLength(1);
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

    expect(payloadsFor(presentPeer)).toContain(payload);
  });

  test('Deck A send-to-A1 does not show on A2 or any B Present', () => {
    const a = registerDeckWithPresents('deck-a', ['present-a1', 'present-a2']);
    registerDeckWithPresents('deck-b', ['present-b1']);
    const payload = { slide: { title: 'only-a1' } };
    graph.handleDeckCommand('deck-a', {
      type: 'send',
      payload,
      target: a.presentIds[0],
    });
    expect(payloadsFor('present-a1')).toContain(payload);
    expect(payloadsFor('present-a2')).not.toContain(payload);
    expect(payloadsFor('present-b1')).not.toContain(payload);
  });

  test('Deck A send-to-all-its-children does not show on B', () => {
    registerDeckWithPresents('deck-a', ['present-a1', 'present-a2']);
    registerDeckWithPresents('deck-b', ['present-b1']);
    const payload = { slide: { title: 'a-all' } };
    graph.handleDeckCommand('deck-a', { type: 'send', payload, target: 'all' });
    expect(payloadsFor('present-a1')).toContain(payload);
    expect(payloadsFor('present-a2')).toContain(payload);
    expect(payloadsFor('present-b1')).not.toContain(payload);
  });

  test('Deck B cannot drive A children by guessing an id', () => {
    const a = registerDeckWithPresents('deck-a', ['present-a1']);
    registerDeckWithPresents('deck-b', ['present-b1']);
    const payload = { slide: { title: 'guess' } };
    graph.handleDeckCommand('deck-b', {
      type: 'send',
      payload,
      target: a.presentIds[0],
    });
    expect(payloadsFor('present-a1')).not.toContain(payload);
    expect(payloadsFor('present-b1')).not.toContain(payload);
  });

  test('missing target presentId sends to nobody', () => {
    registerDeckWithPresents('deck-a', ['present-a1']);
    const payload = { slide: { title: 'missing' } };
    graph.handleDeckCommand('deck-a', {
      type: 'send',
      payload,
      target: 'not-a-real-present-id',
    });
    expect(payloadsFor('present-a1')).not.toContain(payload);
  });

  test('blank payload is directed only to the selected Present child', () => {
    const { presentIds } = registerDeckWithPresents('deck-a', ['present-a1', 'present-a2']);
    const blank = { slide: null, message: null, useGreenScreen: false };

    const result = graph.handleDeckCommand('deck-a', {
      type: 'send',
      payload: blank,
      target: presentIds[0],
    });

    expect(result).toEqual({ ok: true, delivered: 1 });
    expect(payloadsFor('present-a1')).toContain(blank);
    expect(payloadsFor('present-a2')).not.toContain(blank);
  });

  test('blank payload is replayed when its Present child becomes ready', () => {
    const deckPeer = 'deck-a';
    const presentPeer = 'present-a1';
    const reg = graph.registerDeck(deckPeer, makeDeliver(deckPeer));
    const spawn = graph.handleDeckCommand(deckPeer, { type: 'spawn' });
    const blank = { slide: null, message: null, useGreenScreen: false };

    graph.handleDeckCommand(deckPeer, {
      type: 'send',
      payload: blank,
      target: spawn.presentId,
    });
    graph.handlePresentEvent(
      presentPeer,
      { type: 'ready', sessionId: reg.sessionId, presentId: spawn.presentId },
      makeDeliver(presentPeer),
    );

    expect(payloadsFor(presentPeer)).toContain(blank);
  });

  test('closing a Present drops it; reopen gets a new presentId', () => {
    const deckPeer = 'deck-a';
    const reg = graph.registerDeck(deckPeer, makeDeliver(deckPeer));
    const spawn1 = graph.handleDeckCommand(deckPeer, { type: 'spawn' });
    graph.handlePresentEvent(
      'present-a1',
      { type: 'ready', sessionId: reg.sessionId, presentId: spawn1.presentId },
      makeDeliver('present-a1'),
    );
    graph.handleDeckCommand(deckPeer, { type: 'close', presentId: spawn1.presentId });
    const listed = graph.handleDeckCommand(deckPeer, { type: 'list' });
    expect(listed.presents).not.toContain(spawn1.presentId);
    const spawn2 = graph.handleDeckCommand(deckPeer, { type: 'spawn' });
    expect(spawn2.presentId).not.toBe(spawn1.presentId);
  });

  test('window-close unregister removes the child and notifies the deck once', () => {
    const deckPeer = 'deck-a';
    const reg = graph.registerDeck(deckPeer, makeDeliver(deckPeer));
    const spawn = graph.handleDeckCommand(deckPeer, { type: 'spawn' });
    graph.handlePresentEvent(
      'present-a1',
      { type: 'ready', sessionId: reg.sessionId, presentId: spawn.presentId },
      makeDeliver('present-a1'),
    );

    graph.handlePresentEvent('present-a1', { type: 'closed' }, makeDeliver('present-a1'));

    const listed = graph.handleDeckCommand(deckPeer, { type: 'list' });
    expect(listed.presents).not.toContain(spawn.presentId);
    expect(
      (deliveries.get(deckPeer) || []).filter(
        (m) => m.channel === 'poster:deck-event' && m.payload.type === 'child-closed',
      ),
    ).toHaveLength(1);

    const payload = { slide: { title: 'no stale sends' } };
    graph.handleDeckCommand(deckPeer, { type: 'send', payload, target: 'all' });
    expect(payloadsFor('present-a1')).not.toContain(payload);
  });

  test('program-state present-event forwards thumbnail only to owning deck', () => {
    const a = registerDeckWithPresents('deck-a', ['present-a1']);
    registerDeckWithPresents('deck-b', ['present-b1']);
    const program = { title: 'On program', slideType: 'title', backgroundColor: '#111', color: '#fff' };

    const result = graph.handlePresentEvent(
      'present-a1',
      { type: 'program-state', program },
      makeDeliver('present-a1'),
    );
    expect(result.ok).toBe(true);

    const deckAEvents = (deliveries.get('deck-a') || []).filter(
      (m) => m.channel === 'poster:deck-event' && m.payload.type === 'program-thumbnail',
    );
    const deckBEvents = (deliveries.get('deck-b') || []).filter(
      (m) => m.channel === 'poster:deck-event' && m.payload.type === 'program-thumbnail',
    );
    expect(deckAEvents).toHaveLength(1);
    expect(deckAEvents[0].payload).toEqual({
      type: 'program-thumbnail',
      presentId: a.presentIds[0],
      program,
    });
    expect(deckBEvents).toHaveLength(0);
  });
});
