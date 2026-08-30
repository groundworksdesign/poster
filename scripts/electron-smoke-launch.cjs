#!/usr/bin/env node
/**
 * Headless smoke test for Electron unpackaged / packaged launches.
 *
 * Requires: xvfb-run on Linux when $DISPLAY is unset.
 * Usage:
 *   node scripts/electron-smoke-launch.cjs unpackaged
 *   node scripts/electron-smoke-launch.cjs packaged /path/to/linux-unpacked/Poster
 */
'use strict';

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const mode = process.argv[2];
const packagedBin = process.argv[3];
const HOLD_MS = Number(process.env.ELECTRON_SMOKE_HOLD_MS || 15000);
const ROOT = path.join(__dirname, '..');

function die(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
  process.exit(1);
}

function runUnderDisplay(command, args, opts) {
  if (process.platform === 'linux' && !process.env.DISPLAY) {
    return spawn('xvfb-run', ['-a', command, ...args], opts);
  }
  return spawn(command, args, opts);
}

function waitForHttp(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        res.resume();
        resolve(port);
      });
      req.on('error', () => {
        if (Date.now() >= deadline) reject(new Error(`HTTP not up on :${port}`));
        else setTimeout(attempt, 250);
      });
      req.setTimeout(250, () => req.destroy());
    }
    attempt();
  });
}

async function findListeningPosterPort(pid, timeoutMs) {
  // The main process picks an ephemeral port; discover it via /proc or log file.
  const deadline = Date.now() + timeoutMs;
  const logFile = path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
    'Poster',
    'poster-main.log',
  );

  while (Date.now() < deadline) {
    if (fs.existsSync(logFile)) {
      const text = fs.readFileSync(logFile, 'utf8');
      const m = text.match(/starting server on (\d+)/);
      if (m) {
        const port = Number(m[1]);
        try {
          await waitForHttp(port, 2000);
          return port;
        } catch (_) {
          /* keep waiting */
        }
      }
      if (/startup error/i.test(text)) {
        die(`main reported startup error:\n${text}`);
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  die(`timed out waiting for Poster server (log=${logFile})`);
}

async function main() {
  let child;
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-smoke-'));
  // Point Electron userData at a fresh dir so poster-main.log is isolated.
  const env = {
    ...process.env,
    ELECTRON_USER_DATA: userData,
  };

  // Electron respects --user-data-dir more reliably than ELECTRON_USER_DATA.
  const userDataArgs = [`--user-data-dir=${userData}`];

  if (mode === 'unpackaged') {
    const electronBin = require('electron');
    child = runUnderDisplay(electronBin, [ROOT, ...userDataArgs], {
      cwd: ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else if (mode === 'packaged') {
    if (!packagedBin || !fs.existsSync(packagedBin)) {
      die(`packaged binary missing: ${packagedBin}`);
    }
    child = runUnderDisplay(packagedBin, userDataArgs, {
      cwd: path.dirname(packagedBin),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    die('usage: electron-smoke-launch.cjs unpackaged|packaged [bin]');
  }

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (c) => {
    stdout += c;
    process.stdout.write(c);
  });
  child.stderr.on('data', (c) => {
    stderr += c;
    process.stderr.write(c);
  });

  let exitedEarly = false;
  child.on('exit', (code, signal) => {
    exitedEarly = true;
    process.stderr.write(`process exited code=${code} signal=${signal}\n`);
  });

  // Override log path expectation: Electron stores under --user-data-dir.
  const logFile = path.join(userData, 'poster-main.log');
  const started = Date.now();
  let port = null;
  while (Date.now() - started < 20000) {
    if (exitedEarly) {
      die(`process quit before UI ready.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
    }
    if (fs.existsSync(logFile)) {
      const text = fs.readFileSync(logFile, 'utf8');
      if (/startup error/i.test(text)) {
        die(`startup error in log:\n${text}\nstderr:\n${stderr}`);
      }
      const m = text.match(/starting server on (\d+)/);
      if (m) {
        port = Number(m[1]);
        try {
          await waitForHttp(port, 1500);
          break;
        } catch (_) {
          /* retry */
        }
      }
      if (/window created/i.test(text)) break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  if (!port) {
    // Fall back: scan child output for "Server listening on port N"
    const m = `${stdout}\n${stderr}`.match(/Server listening on port (\d+)/);
    if (m) port = Number(m[1]);
  }
  if (!port) {
    die(`never saw a listening server.\nlog=${fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '(missing)'}\nstderr:\n${stderr}`);
  }

  // Confirm HTML UI (not empty / error)
  const html = await new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}/`, (res) => {
        let body = '';
        res.on('data', (d) => {
          body += d;
        });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      })
      .on('error', reject);
  });
  if (html.status !== 200) die(`UI HTTP status ${html.status}`);
  if (!/html/i.test(html.body)) die('UI response was not HTML');

  process.stdout.write(`OK: UI up on :${port}; holding ${HOLD_MS}ms to prove no self-quit...\n`);
  const holdStart = Date.now();
  while (Date.now() - holdStart < HOLD_MS) {
    if (exitedEarly) die('process self-quit during hold window');
    await new Promise((r) => setTimeout(r, 500));
  }

  process.stdout.write('OK: stayed alive; shutting down.\n');
  try {
    child.kill('SIGTERM');
  } catch (_) {
    /* ignore */
  }
  setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch (_) {
      /* ignore */
    }
    process.exit(0);
  }, 2000).unref();
}

main().catch((err) => die(err && err.stack ? err.stack : String(err)));
