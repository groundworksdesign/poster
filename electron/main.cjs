'use strict';

const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const http = require('http');
const path = require('path');

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
  const serverEntry = path.join(appRoot, 'server', 'index.js');
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
// Create the main browser window
// ---------------------------------------------------------------------------
function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    title: 'Poster',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  configureWindowOpen(mainWindow);
  mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/** Allow window.open from the UI to spawn real child windows (deck, presentation). */
function configureWindowOpen(win) {
  win.webContents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: {
      width: 1280,
      height: 720,
      show: true,
      title: 'Poster',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    },
  }));
  win.webContents.on('did-create-window', (childWin) => {
    configureWindowOpen(childWin);
  });
}

async function openMainWindow() {
  if (BrowserWindow.getAllWindows().length > 0) {
    focusMainWindow();
    return;
  }

  if (!serverProcess || serverPort === null) {
    const port = await findFreePort();
    serverPort = port;
    logLine(`starting server on ${port} (packaged=${app.isPackaged}) root=${getAppRoot()}`);
    await startServer(port);
    await waitForServer(port);
  }

  createWindow(serverPort);
  logLine('window created');
}

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

// ---------------------------------------------------------------------------
// App lifecycle — only one GUI instance; second launches focus the first
// ---------------------------------------------------------------------------
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    focusMainWindow();
  });

  app.on('ready', async () => {
    try {
      await openMainWindow();
    } catch (err) {
      logLine(`startup error: ${err && err.stack ? err.stack : err}`);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    // macOS: keep process (and server) alive in the Dock until Cmd+Q
    if (process.platform !== 'darwin') {
      killServer();
      app.quit();
    }
  });

  app.on('activate', () => {
    // Dock click / re-activate with no windows — recreate main window (no relaunch)
    if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
      openMainWindow().catch((err) => {
        logLine(`activate window error: ${err && err.stack ? err.stack : err}`);
      });
    }
  });

  app.on('before-quit', () => {
    killServer();
  });
}
