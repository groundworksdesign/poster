'use strict';

const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const net = require('net');
const http = require('http');
const path = require('path');

let serverProcess = null;
let mainWindow = null;
let serverPort = null;

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
function waitForServer(port, timeoutMs = 10000) {
  const interval = 200;
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        res.resume(); // discard body
        resolve();
      });
      req.on('error', () => {
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

  // Electron's binary (process.execPath) can run as Node when
  // ELECTRON_RUN_AS_NODE=1. Without it, spawn opens new GUI instances.
  const nodeBin = process.execPath;

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
    console.error('[server] spawn error:', err);
  });
  serverProcess.on('exit', (code, signal) => {
    console.log(`[server] exited code=${code} signal=${signal}`);
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
    title: 'Poster',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
      const port = await findFreePort();
      serverPort = port;
      await startServer(port);
      await waitForServer(port);
      createWindow(port);
    } catch (err) {
      console.error('[main] startup error:', err);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    killServer();
    // On macOS, keep app in Dock until Cmd+Q (standard behaviour)
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // Re-create window on macOS when clicking Dock icon with no windows open
    if (mainWindow === null && serverPort !== null && serverProcess) {
      createWindow(serverPort);
    }
  });

  app.on('before-quit', () => {
    killServer();
  });
}
