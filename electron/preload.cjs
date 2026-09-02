'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('poster', {
  deckCommand: (command) => ipcRenderer.invoke('poster:deck-command', command),
  presentEvent: (event) => ipcRenderer.send('poster:present-event', event),
  onDeckEvent: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('poster:deck-event', listener);
    return () => ipcRenderer.removeListener('poster:deck-event', listener);
  },
  onPresentPush: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('poster:present-push', listener);
    return () => ipcRenderer.removeListener('poster:present-push', listener);
  },
});
