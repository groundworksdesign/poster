'use strict';

/**
 * Packaged-app update checks.
 *
 * - Windows / Linux: electron-updater download + quitAndInstall
 * - macOS: GitHub Releases version check + dialog that opens the download page
 *   (no in-app overwrite until Developer ID + notarization)
 */

const {
  updateModeForPlatform,
  isNewerVersion,
  buildUpdateAvailableDialog,
  buildUpdateDownloadedDialog,
  releasesLatestUrl,
  githubApiLatestUrl,
  parseGithubLatestRelease,
} = require('./updatePolicy.cjs');

const CHECK_DELAY_MS = 4000;

/**
 * @param {object} deps
 * @param {typeof import('electron').app} deps.app
 * @param {typeof import('electron').dialog} deps.dialog
 * @param {typeof import('electron').shell} deps.shell
 * @param {(msg: string) => void} deps.log
 * @param {() => import('electron').BrowserWindow|null} [deps.getParentWindow]
 * @param {typeof import('electron-updater').autoUpdater} [deps.autoUpdater]
 * @param {typeof fetch} [deps.fetchImpl]
 * @param {string} [deps.platform]
 * @param {number} [deps.checkDelayMs]
 */
function createAutoUpdateController(deps) {
  const {
    app,
    dialog,
    shell,
    log,
    getParentWindow = () => null,
    platform = process.platform,
    checkDelayMs = CHECK_DELAY_MS,
    fetchImpl = global.fetch.bind(global),
  } = deps;

  let autoUpdater = deps.autoUpdater || null;
  let checking = false;
  let downloadInFlight = false;
  let timer = null;
  let menuRegistered = false;

  function parent() {
    try {
      return getParentWindow();
    } catch (_) {
      return null;
    }
  }

  async function showMessageBox(options) {
    const win = parent();
    if (win && !win.isDestroyed()) {
      return dialog.showMessageBox(win, options);
    }
    return dialog.showMessageBox(options);
  }

  async function fetchLatestRelease() {
    const res = await fetchImpl(githubApiLatestUrl(), {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Poster-Electron-Updater',
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub latest release HTTP ${res.status}`);
    }
    return parseGithubLatestRelease(await res.json());
  }

  async function ensureAutoUpdater() {
    if (autoUpdater) return autoUpdater;
    // Lazy require so unit tests can inject a mock and unpackaged trees without
    // electron-updater still load main.cjs in Jest.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const mod = require('electron-updater');
    autoUpdater = mod.autoUpdater;
    return autoUpdater;
  }

  async function handleMacAlert(latest, { userInitiated }) {
    const dlg = buildUpdateAvailableDialog({
      currentVersion: app.getVersion(),
      remoteVersion: latest.version,
      mode: 'alert',
    });
    const { response } = await showMessageBox({
      type: dlg.type,
      title: dlg.title,
      message: dlg.message,
      detail: dlg.detail,
      buttons: dlg.buttons,
      defaultId: dlg.defaultId,
      cancelId: dlg.cancelId,
    });
    if (response === dlg.openDownloadPageResponse) {
      const url = latest.htmlUrl || releasesLatestUrl();
      await shell.openExternal(url);
      log(`opened download page ${url}`);
    }
  }

  async function handleInstallFlow(latest, { userInitiated }) {
    const updater = await ensureAutoUpdater();
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = true;

    const dlg = buildUpdateAvailableDialog({
      currentVersion: app.getVersion(),
      remoteVersion: latest.version,
      mode: 'install',
    });
    const { response } = await showMessageBox({
      type: dlg.type,
      title: dlg.title,
      message: dlg.message,
      detail: dlg.detail,
      buttons: dlg.buttons,
      defaultId: dlg.defaultId,
      cancelId: dlg.cancelId,
    });
    if (response !== dlg.downloadResponse) return;

    downloadInFlight = true;
    try {
      // Prefer electron-updater's channel (latest.yml on the Release). Fall back
      // to a version check already done via GitHub if checkForUpdates fails.
      const result = await updater.checkForUpdates();
      if (!result || !result.updateInfo) {
        throw new Error('No update info from electron-updater');
      }
      await updater.downloadUpdate();
      const ready = buildUpdateDownloadedDialog({ remoteVersion: latest.version });
      const restart = await showMessageBox({
        type: ready.type,
        title: ready.title,
        message: ready.message,
        detail: ready.detail,
        buttons: ready.buttons,
        defaultId: ready.defaultId,
        cancelId: ready.cancelId,
      });
      if (restart.response === ready.restartResponse) {
        updater.quitAndInstall(false, true);
      }
    } catch (err) {
      log(`install update failed: ${err && err.message ? err.message : err}`);
      if (userInitiated) {
        await showMessageBox({
          type: 'warning',
          title: 'Update failed',
          message: 'Could not download the update.',
          detail:
            'Open the GitHub Releases page to install manually, or try again later.',
          buttons: ['Open download page', 'OK'],
          defaultId: 0,
          cancelId: 1,
        }).then(async (r) => {
          if (r.response === 0) {
            await shell.openExternal(latest.htmlUrl || releasesLatestUrl());
          }
        });
      }
    } finally {
      downloadInFlight = false;
    }
  }

  /**
   * @param {{ userInitiated?: boolean }} [opts]
   */
  async function checkForUpdates(opts = {}) {
    const userInitiated = Boolean(opts.userInitiated);
    if (!app.isPackaged && !userInitiated) {
      return;
    }
    if (checking || downloadInFlight) {
      if (userInitiated) {
        await showMessageBox({
          type: 'info',
          title: 'Updates',
          message: 'An update check is already in progress.',
          buttons: ['OK'],
        });
      }
      return;
    }
    checking = true;
    try {
      const latest = await fetchLatestRelease();
      if (!latest) {
        throw new Error('Could not parse latest release');
      }
      const current = app.getVersion();
      if (!isNewerVersion(latest.version, current)) {
        log(`update check: up to date (${current})`);
        if (userInitiated) {
          await showMessageBox({
            type: 'info',
            title: 'You’re up to date',
            message: `Poster ${current} is the latest release.`,
            buttons: ['OK'],
          });
        }
        return;
      }
      log(`update check: ${latest.version} available (have ${current})`);
      const mode = updateModeForPlatform(platform);
      if (mode === 'alert') {
        await handleMacAlert(latest, { userInitiated });
      } else {
        await handleInstallFlow(latest, { userInitiated });
      }
    } catch (err) {
      log(`update check failed: ${err && err.message ? err.message : err}`);
      if (userInitiated) {
        await showMessageBox({
          type: 'warning',
          title: 'Update check failed',
          message: 'Could not reach GitHub Releases.',
          detail: String(err && err.message ? err.message : err),
          buttons: ['OK'],
        });
      }
    } finally {
      checking = false;
    }
  }

  function scheduleStartupCheck() {
    if (!app.isPackaged) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      checkForUpdates({ userInitiated: false }).catch(() => {});
    }, checkDelayMs);
  }

  /**
   * Install an application menu that includes Check for Updates…
   * @param {typeof import('electron').Menu} Menu
   */
  function registerUpdateMenu(Menu) {
    if (menuRegistered) return;
    menuRegistered = true;
    try {
      const isMac = platform === 'darwin';
      const checkItem = {
        label: 'Check for Updates…',
        click: () => {
          checkForUpdates({ userInitiated: true }).catch(() => {});
        },
      };
      const template = [
        ...(isMac
          ? [
              {
                label: app.name || 'Poster',
                submenu: [
                  { role: 'about' },
                  checkItem,
                  { type: 'separator' },
                  { role: 'services' },
                  { type: 'separator' },
                  { role: 'hide' },
                  { role: 'hideOthers' },
                  { role: 'unhide' },
                  { type: 'separator' },
                  { role: 'quit' },
                ],
              },
            ]
          : [
              {
                label: 'File',
                submenu: [checkItem, { type: 'separator' }, { role: 'quit' }],
              },
            ]),
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
        {
          role: 'help',
          submenu: isMac ? [checkItem] : [checkItem],
        },
      ];
      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    } catch (err) {
      log(`update menu failed: ${err && err.message ? err.message : err}`);
    }
  }

  return {
    checkForUpdates,
    scheduleStartupCheck,
    registerUpdateMenu,
    CHECK_DELAY_MS: checkDelayMs,
  };
}

module.exports = {
  createAutoUpdateController,
  CHECK_DELAY_MS,
};
