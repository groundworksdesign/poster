'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const http = require('http');
const os = require('os');
const path = require('path');
const { registerSessionIpc } = require('./sessionIpc.cjs');
const {
  classifyOpenUrl,
  shouldCreateHomeWindow,
} = require('./homeWindowPolicy.cjs');
const { readThemePrefs, writeThemePrefs } = require('./themePrefs.cjs');

ipcMain.on('poster:read-theme-sync', (event) => {
  event.returnValue = readThemePrefs();
});

ipcMain.handle('poster:read-theme', () => readThemePrefs());

ipcMain.handle('poster:set-theme', (_event, theme) => writeThemePrefs(theme));

// Native folder picker so Home "Change..." can re-point the library root in
// packaged Electron (renderers do not support window.prompt). Returns the
// chosen directory path, or null when the operator cancels.
ipcMain.handle('poster:pick-library-folder', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const options = {
    title: 'Choose library folder',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: process.env.POSTER_LIBRARY_PATH || undefined,
  };
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

const sessionIpc = registerSessionIpc();

let serverProcess = null;
let mainWindow = null;
let serverPort = null;
let serverExitInfo = null;

// ---------------------------------------------------------------------------
// Resolve app root (works both from `electron .` dev and packaged mode)
// ---------------------------------------------------------------------------
function getAppRoot() {
  if (app.isPackaged) {
    // In a packaged app, resources live in process.resourcesPath/app
    return path.join(process.resourcesPath, 'app');
  }
  return app.getAppPath();
}

function logLine(message) {
  const line = `[main] ${message}\n`;
  process.stderr.write(line);
  try {
    const logFile = path.join(app.getPath('userData'), 'poster-main.log');
    fs.appendFileSync(logFile, line);
  } catch (_) {
    // logging must never block startup
  }
}

// ---------------------------------------------------------------------------
// Pick an ephemeral free TCP port by asking the OS for port 0
// ---------------------------------------------------------------------------
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
    srv.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Poll until the server responds 200 (or any HTTP response) on the given port
// ---------------------------------------------------------------------------
function waitForServer(port, timeoutMs = 15000) {
  const interval = 200;
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    function attempt() {
      if (serverExitInfo) {
        reject(
          new Error(
            `Server exited before becoming ready (code=${serverExitInfo.code} signal=${serverExitInfo.signal})`,
          ),
        );
        return;
      }

      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        res.resume(); // discard body
        resolve();
      });
      req.on('error', () => {
        if (serverExitInfo) {
          reject(
            new Error(
              `Server exited before becoming ready (code=${serverExitInfo.code} signal=${serverExitInfo.signal})`,
            ),
          );
          return;
        }
        if (Date.now() >= deadline) {
          reject(new Error(`Server did not start within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, interval);
        }
      });
      req.setTimeout(interval, () => req.destroy());
    }
    attempt();
  });
}

// ---------------------------------------------------------------------------
// Spawn the embedded Express / Remix server as a child Node process
// ---------------------------------------------------------------------------
async function startServer(port) {
  const appRoot = getAppRoot();
  const serverEntry = path.join(appRoot, 'src', 'adapters', 'persistence', 'server.js');
  const expressMarker = path.join(appRoot, 'node_modules', 'express', 'package.json');

  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Server entry missing: ${serverEntry}`);
  }
  if (!fs.existsSync(expressMarker)) {
    throw new Error(
      `Packaged app is missing node_modules/express under ${appRoot}. ` +
        'Rebuild with scripts/prepare-electron-pack.cjs so electron-builder includes production dependencies.',
    );
  }

  // Electron's binary (process.execPath) can run as Node when
  // ELECTRON_RUN_AS_NODE=1. Without it, spawn opens new GUI instances on
  // every packaged target (macOS DMG, Windows NSIS, Linux deb/AppImage).
  const nodeBin = process.execPath;
  serverExitInfo = null;

  serverProcess = spawn(nodeBin, [serverEntry], {
    cwd: appRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(port),
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => {
    process.stdout.write(`[server] ${chunk}`);
  });
  serverProcess.stderr.on('data', (chunk) => {
    process.stderr.write(`[server] ${chunk}`);
  });
  serverProcess.on('error', (err) => {
    logLine(`spawn error: ${err && err.stack ? err.stack : err}`);
  });
  serverProcess.on('exit', (code, signal) => {
    serverExitInfo = { code, signal };
    logLine(`server exited code=${code} signal=${signal}`);
    serverProcess = null;
  });
}

// ---------------------------------------------------------------------------
// Tear down the server child process
// ---------------------------------------------------------------------------
function killServer() {
  if (!serverProcess) return;
  try {
    serverProcess.kill('SIGTERM');
  } catch (_) {
    // already gone
  }
  serverProcess = null;
}

// ---------------------------------------------------------------------------
// Create the main (Home/Library) browser window — only one
// ---------------------------------------------------------------------------
const preloadPath = path.join(__dirname, 'preload.cjs');

function homeOrigin() {
  return `http://127.0.0.1:${serverPort}`;
}

function attachWindowLifecycle(win) {
  win.webContents.on('destroyed', () => {
    sessionIpc.onWebContentsDestroyed(win.webContents);
  });
}

function defaultWebPreferences() {
  return {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    preload: preloadPath,
  };
}

/**
 * Open Present as a first-class BrowserWindow with preload + normal document load.
 * Do not use Chromium's window.open "allow" popup path after async spawnPresent():
 * on packaged AppImage that path can still leave SSR "Loading..." with no Remix
 * client hydrate on cold first open (Jack 2/3). Main-owned loadURL matches how
 * Home opens Deck and restores PR #18 reliability under the clean-arch layout.
 */
function openPresentSessionWindow(absoluteUrl) {
  const present = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    title: 'Poster Present',
    webPreferences: defaultWebPreferences(),
  });
  attachWindowLifecycle(present);
  attachWindowOpenPolicy(present);
  present.loadURL(absoluteUrl);
  return present;
}

/**
 * Window-open policy: never a second Home; bare /presentation denied;
 * present-session is main-owned (loadURL); deck / present-blank may use allow.
 */
function attachWindowOpenPolicy(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    const kind = classifyOpenUrl(url);
    if (kind === 'home') {
      focusMainWindow();
      return { action: 'deny' };
    }
    if (kind === 'present-bare') {
      // Present requires session params; open a deck instead so Home stays put.
      openDeckWindow();
      return { action: 'deny' };
    }
    // Packaged Deck skips about:blank and window.open(absolute Present URL).
    // Own that window in main so cold open always gets preload + full navigation.
    if (kind === 'present-session') {
      openPresentSessionWindow(url);
      return { action: 'deny' };
    }
    // deck: Home "Open Presentation" still uses window.open allow path.
    // present-blank: browser/Remix gesture path (about:blank) if it reaches Electron.
    if (kind === 'deck' || kind === 'present-blank') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1280,
          height: 800,
          webPreferences: defaultWebPreferences(),
        },
      };
    }
    return { action: 'deny' };
  });

  win.webContents.on('did-create-window', (child) => {
    attachWindowLifecycle(child);
    attachWindowOpenPolicy(child);
  });
}

function createHomeWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    title: 'Poster',
    webPreferences: defaultWebPreferences(),
  });

  attachWindowLifecycle(mainWindow);
  attachWindowOpenPolicy(mainWindow);
  mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  return mainWindow;
}

/** Focus existing Home or create the single Home window. Never a second Home. */
function ensureHomeWindow(port) {
  const create = shouldCreateHomeWindow({
    exists: Boolean(mainWindow),
    destroyed: Boolean(mainWindow && mainWindow.isDestroyed()),
  });
  if (!create) {
    focusMainWindow();
    return mainWindow;
  }
  return createHomeWindow(port);
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function openDeckWindow() {
  if (serverPort == null) return;
  const deck = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    title: 'Poster Deck',
    webPreferences: defaultWebPreferences(),
  });
  attachWindowLifecycle(deck);
  attachWindowOpenPolicy(deck);
  deck.loadURL(`${homeOrigin()}/deck`);
}

// ---------------------------------------------------------------------------
// App lifecycle — only one GUI instance; second launches focus the first
// ---------------------------------------------------------------------------
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (serverPort != null) {
      ensureHomeWindow(serverPort);
    } else {
      focusMainWindow();
    }
  });

  app.on('ready', async () => {
    try {
      const port = await findFreePort();
      serverPort = port;
      logLine(`starting server on ${port} (packaged=${app.isPackaged}) root=${getAppRoot()}`);
      await startServer(port);
      await waitForServer(port);
      ensureHomeWindow(port);
      logLine('window created');
    } catch (err) {
      logLine(`startup error: ${err && err.stack ? err.stack : err}`);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    // On macOS, keep app in Dock until Cmd+Q (standard behaviour)
    if (process.platform !== 'darwin') {
      killServer();
      app.quit();
    }
  });

  app.on('activate', () => {
    if (serverPort === null) return;
    // Focus existing Home, or recreate only when there is no Home window
    if (mainWindow && !mainWindow.isDestroyed()) {
      focusMainWindow();
    } else if (serverProcess) {
      ensureHomeWindow(serverPort);
    }
  });

  app.on('before-quit', () => {
    killServer();
  });
}
