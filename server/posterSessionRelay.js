'use strict';

const { PosterSessionGraph } = require('../shared/posterSessionGraph.cjs');

/** @type {PosterSessionGraph} */
let graph;

/** @type {Map<string, { deck: import('express').Response[], present: import('express').Response[] }>} */
const streamClients = new Map();

function getGraph() {
  if (!graph) graph = new PosterSessionGraph();
  return graph;
}

function ensurePeerStreams(peerId) {
  if (!streamClients.has(peerId)) {
    streamClients.set(peerId, { deck: [], present: [] });
  }
  return streamClients.get(peerId);
}

function deliverToPeer(peerId, channel, payload) {
  const streams = streamClients.get(peerId);
  if (!streams) return;
  const list = channel === 'poster:present-push' ? streams.present : streams.deck;
  const data = JSON.stringify({ channel, payload });
  for (const res of list) {
    res.write(`data: ${data}\n\n`);
  }
}

function writeSse(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
}

/**
 * Mount poster session relay routes on an Express app (before Remix catch-all).
 * @param {import('express').Express} app
 */
function mountPosterSessionRelay(app) {
  app.use('/api/poster', require('express').json());

  app.post('/api/poster/deck-command', (req, res) => {
    const peerId = req.body?.peerId;
    const command = req.body?.command;
    if (!peerId || !command) {
      res.status(400).json({ ok: false, error: 'peerId-and-command-required' });
      return;
    }

    const g = getGraph();

    if (command.type === 'register') {
      if (!g.peers.has(peerId)) {
        g.registerDeck(peerId, (channel, payload) => deliverToPeer(peerId, channel, payload));
      }
      const peer = g.peers.get(peerId);
      res.json({ ok: true, sessionId: peer?.sessionId });
      return;
    }

    const result = g.handleDeckCommand(peerId, command);
    res.json(result);
  });

  app.post('/api/poster/present-event', (req, res) => {
    const peerId = req.body?.peerId;
    const event = req.body?.event;
    if (!peerId || !event) {
      res.status(400).json({ ok: false, error: 'peerId-and-event-required' });
      return;
    }

    const g = getGraph();
    const result = g.handlePresentEvent(peerId, event, (channel, payload) =>
      deliverToPeer(peerId, channel, payload),
    );
    res.json(result);
  });

  app.get('/api/poster/stream/deck', (req, res) => {
    const peerId = req.query.peerId;
    if (typeof peerId !== 'string' || !peerId) {
      res.status(400).end('peerId required');
      return;
    }
    writeSse(res);
    const streams = ensurePeerStreams(peerId);
    streams.deck.push(res);
    req.on('close', () => {
      const idx = streams.deck.indexOf(res);
      if (idx >= 0) streams.deck.splice(idx, 1);
      getGraph().unregister(peerId);
    });
  });

  app.get('/api/poster/stream/present', (req, res) => {
    const peerId = req.query.peerId;
    if (typeof peerId !== 'string' || !peerId) {
      res.status(400).end('peerId required');
      return;
    }
    writeSse(res);
    const streams = ensurePeerStreams(peerId);
    streams.present.push(res);
    req.on('close', () => {
      const idx = streams.present.indexOf(res);
      if (idx >= 0) streams.present.splice(idx, 1);
      getGraph().unregister(peerId);
    });
  });

  /** Test-only reset */
  app.post('/api/poster/test/reset', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(404).end();
      return;
    }
    graph = new PosterSessionGraph();
    streamClients.clear();
    res.json({ ok: true });
  });
}

module.exports = { mountPosterSessionRelay, getGraph, _resetForTests: () => {
  graph = new PosterSessionGraph();
  streamClients.clear();
} };
