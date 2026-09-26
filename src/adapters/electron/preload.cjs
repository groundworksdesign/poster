'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('poster', {
  readThemeSync: () => ipcRenderer.sendSync('poster:read-theme-sync'),
  readTheme: () => ipcRenderer.invoke('poster:read-theme'),
  setTheme: (theme) => ipcRenderer.invoke('poster:set-theme', theme),
  pickLibraryFolder: () => ipcRenderer.invoke('poster:pick-library-folder'),
  deckCommand: (command) => ipcRenderer.invoke('poster:deck-command', command),
  presentEvent: (event) => ipcRenderer.send('poster:present-event', event),
  enterFullscreen: () => ipcRenderer.invoke('poster:enter-fullscreen'),
  exitFullscreen: () => ipcRenderer.invoke('poster:exit-fullscreen'),
  toggleFullscreen: () => ipcRenderer.invoke('poster:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('poster:is-fullscreen'),
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
