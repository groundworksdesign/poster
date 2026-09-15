'use strict';

const { PosterSessionGraph } = require('../../domain/posterSessionGraph.cjs');

const GLOBAL_KEY = '__posterSessionRelayState';

function getState() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = {
      graph: new PosterSessionGraph(),
      streamClients: new Map(),
    };
  }
  return globalThis[GLOBAL_KEY];
}

function getGraph() {
  return getState().graph;
}

function ensurePeerStreams(peerId) {
  const { streamClients } = getState();
  if (!streamClients.has(peerId)) {
    streamClients.set(peerId, { deck: [], present: [] });
  }
  return streamClients.get(peerId);
}

function deliverToPeer(peerId, channel, payload) {
  const state = getState();
  const streams = state.streamClients.get(peerId);
  if (streams) {
    const list = channel === 'poster:present-push' ? streams.present : streams.deck;
    const data = `data: ${JSON.stringify({ channel, payload })}\n\n`;
    for (const sink of list) {
      try {
        sink.write(data);
      } catch (_) {
        // sink may be closed
      }
    }
  }
  // Always enqueue for poll clients (Remix SSE often ends immediately).
  if (!state.queues) state.queues = new Map();
  if (!state.queues.has(peerId)) state.queues.set(peerId, []);
  state.queues.get(peerId).push({ channel, payload });
}

function drainQueue(peerId) {
  const state = getState();
  if (!state.queues) state.queues = new Map();
  const items = state.queues.get(peerId) || [];
  state.queues.set(peerId, []);
  return items;
}

function processDeckCommand(peerId, command) {
  const g = getGraph();
  if (command.type === 'register') {
    if (!g.peers.has(peerId)) {
      g.registerDeck(peerId, (channel, payload) => deliverToPeer(peerId, channel, payload));
    }
    const peer = g.peers.get(peerId);
    return { ok: true, sessionId: peer?.sessionId };
  }
  return g.handleDeckCommand(peerId, command);
}

function processPresentEvent(peerId, event) {
  const g = getGraph();
  return g.handlePresentEvent(peerId, event, (channel, payload) =>
    deliverToPeer(peerId, channel, payload),
  );
}

function attachStream(peerId, kind, sink) {
  const streams = ensurePeerStreams(peerId);
  const list = kind === 'present' ? streams.present : streams.deck;
  list.push(sink);
  return () => {
    const idx = list.indexOf(sink);
    if (idx >= 0) list.splice(idx, 1);
    const remaining = streams.deck.length + streams.present.length;
    if (remaining === 0) {
      getGraph().unregister(peerId);
    }
  };
}

function createSseResponse(peerId, kind) {
  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const sink = {
        write(chunk) {
          controller.enqueue(encoder.encode(chunk));
        },
      };
      unsubscribe = attachStream(peerId, kind, sink);
      controller.enqueue(encoder.encode(': connected\n\n'));
    },
    cancel() {
      unsubscribe();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function mountPosterSessionRelay(app) {
  app.use('/api/poster', require('express').json());

  app.post('/api/poster/deck-command', (req, res) => {
    const peerId = req.body?.peerId;
    const command = req.body?.command;
    if (!peerId || !command) {
      res.status(400).json({ ok: false, error: 'peerId-and-command-required' });
      return;
    }
    res.json(processDeckCommand(peerId, command));
  });

  app.post('/api/poster/present-event', (req, res) => {
    const peerId = req.body?.peerId;
    const event = req.body?.event;
    if (!peerId || !event) {
      res.status(400).json({ ok: false, error: 'peerId-and-event-required' });
      return;
    }
    res.json(processPresentEvent(peerId, event));
  });

  app.get('/api/poster/stream/deck', (req, res) => {
    const peerId = req.query.peerId;
    if (typeof peerId !== 'string' || !peerId) {
      res.status(400).end('peerId required');
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const unsubscribe = attachStream(peerId, 'deck', {
      write(chunk) {
        res.write(chunk);
      },
    });
    req.on('close', unsubscribe);
  });

  app.get('/api/poster/stream/present', (req, res) => {
    const peerId = req.query.peerId;
    if (typeof peerId !== 'string' || !peerId) {
      res.status(400).end('peerId required');
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const unsubscribe = attachStream(peerId, 'present', {
      write(chunk) {
        res.write(chunk);
      },
    });
    req.on('close', unsubscribe);
  });

  app.get('/api/poster/poll', (req, res) => {
    const peerId = req.query.peerId;
    if (typeof peerId !== 'string' || !peerId) {
      res.status(400).json({ ok: false, error: 'peerId-required' });
      return;
    }
    res.json({ ok: true, messages: drainQueue(peerId) });
  });

  app.post('/api/poster/test/reset', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(404).end();
      return;
    }
    const state = getState();
    state.graph = new PosterSessionGraph();
    state.streamClients.clear();
    res.json({ ok: true });
  });
}

module.exports = {
  mountPosterSessionRelay,
  getGraph,
  processDeckCommand,
  processPresentEvent,
  createSseResponse,
  drainQueue,
  _resetForTests: () => {
    const state = getState();
    state.graph = new PosterSessionGraph();
    state.streamClients.clear();
    state.queues = new Map();
  },
};
