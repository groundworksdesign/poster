'use strict';

const { ipcMain } = require('electron');
const { PosterSessionGraph } = require('../../domain/posterSessionGraph.cjs');

/** @type {PosterSessionGraph} */
const graph = new PosterSessionGraph();

/** @type {Map<number, string>} webContentsId -> peerId */
const wcToPeer = new Map();

/** @type {Map<string, import('electron').WebContents>} peerId -> webContents */
const peerToWc = new Map();

function deliverToPeer(peerId, channel, payload) {
  const wc = peerToWc.get(peerId);
  if (!wc || wc.isDestroyed()) return;
  wc.send(channel, payload);
}

function bindWebContents(peerId, webContents) {
  peerToWc.set(peerId, webContents);
  wcToPeer.set(webContents.id, peerId);
}

function unbindWebContents(webContents) {
  const peerId = wcToPeer.get(webContents.id);
  if (peerId) {
    graph.unregister(peerId);
    peerToWc.delete(peerId);
    wcToPeer.delete(webContents.id);
  }
}

function registerSessionIpc(getWebContents) {
  ipcMain.handle('poster:deck-command', async (event, command) => {
    const wc = event.sender;
    let peerId = wcToPeer.get(wc.id);

    if (command.type === 'register') {
      if (!peerId) {
        peerId = require('../../domain/posterSessionGraph.cjs').uuid();
        bindWebContents(peerId, wc);
        const result = graph.registerDeck(peerId, (channel, payload) =>
          deliverToPeer(peerId, channel, payload),
        );
        return { ok: true, peerId, sessionId: result.sessionId };
      }
      const peer = graph.peers.get(peerId);
      return { ok: true, peerId, sessionId: peer?.sessionId };
    }

    if (!peerId) {
      return { ok: false, error: 'deck-not-registered' };
    }
    return graph.handleDeckCommand(peerId, command);
  });

  ipcMain.on('poster:present-event', (event, presentEvent) => {
    const wc = event.sender;
    let peerId = wcToPeer.get(wc.id);
    if (!peerId) {
      peerId = require('../../domain/posterSessionGraph.cjs').uuid();
      bindWebContents(peerId, wc);
    }

    graph.handlePresentEvent(peerId, presentEvent, (channel, payload) =>
      deliverToPeer(peerId, channel, payload),
    );
  });

  return {
    onWebContentsDestroyed: (webContents) => {
      unbindWebContents(webContents);
    },
    graph,
  };
}

module.exports = { registerSessionIpc, graph };
