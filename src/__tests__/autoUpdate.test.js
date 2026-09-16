'use strict';

const { createAutoUpdateController } = require('../adapters/electron/autoUpdate.cjs');

function mockApp(version = '0.1.15', isPackaged = true) {
  return {
    getVersion: () => version,
    isPackaged,
    name: 'Poster',
  };
}

function mockDialog() {
  const calls = [];
  return {
    calls,
    showMessageBox: jest.fn(async (_winOrOpts, maybeOpts) => {
      const opts = maybeOpts || _winOrOpts;
      calls.push(opts);
      return { response: 1 }; // Later / cancel by default
    }),
  };
}

describe('createAutoUpdateController', () => {
  it('on darwin opens download page when user chooses Open', async () => {
    const dialog = mockDialog();
    dialog.showMessageBox.mockImplementationOnce(async (opts) => {
      dialog.calls.push(opts);
      return { response: 0 };
    });
    const openExternal = jest.fn(async () => {});
    const logs = [];
    const controller = createAutoUpdateController({
      app: mockApp('0.1.15', true),
      dialog,
      shell: { openExternal },
      log: (m) => logs.push(m),
      platform: 'darwin',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          tag_name: 'v0.1.16',
          html_url: 'https://github.com/groundworksdesign/poster/releases/tag/v0.1.16',
        }),
      }),
    });

    await controller.checkForUpdates({ userInitiated: true });

    expect(dialog.showMessageBox).toHaveBeenCalled();
    const opts = dialog.calls[0];
    expect(opts.buttons[0]).toMatch(/Open download page/i);
    expect(openExternal).toHaveBeenCalledWith(
      'https://github.com/groundworksdesign/poster/releases/tag/v0.1.16',
    );
    expect(logs.some((l) => /0\.1\.16 available/.test(l))).toBe(true);
  });

  it('on win32 offers Download and install and does not open browser on Later', async () => {
    const dialog = mockDialog();
    dialog.showMessageBox.mockImplementationOnce(async (opts) => {
      dialog.calls.push(opts);
      return { response: 1 }; // Later
    });
    const openExternal = jest.fn();
    const autoUpdater = {
      autoDownload: true,
      checkForUpdates: jest.fn(),
      downloadUpdate: jest.fn(),
      quitAndInstall: jest.fn(),
    };
    const controller = createAutoUpdateController({
      app: mockApp('0.1.15', true),
      dialog,
      shell: { openExternal },
      log: () => {},
      platform: 'win32',
      autoUpdater,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          tag_name: 'v0.1.16',
          html_url: 'https://github.com/groundworksdesign/poster/releases/tag/v0.1.16',
        }),
      }),
    });

    await controller.checkForUpdates({ userInitiated: true });

    expect(dialog.calls[0].buttons[0]).toMatch(/Download and install/i);
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('skips silent startup check when unpackaged', async () => {
    const fetchImpl = jest.fn();
    const controller = createAutoUpdateController({
      app: mockApp('0.1.15', false),
      dialog: mockDialog(),
      shell: { openExternal: jest.fn() },
      log: () => {},
      platform: 'linux',
      fetchImpl,
      checkDelayMs: 1,
    });
    await controller.checkForUpdates({ userInitiated: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('shows up to date when remote is not newer', async () => {
    const dialog = mockDialog();
    const controller = createAutoUpdateController({
      app: mockApp('0.1.16', true),
      dialog,
      shell: { openExternal: jest.fn() },
      log: () => {},
      platform: 'linux',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ tag_name: 'v0.1.16' }),
      }),
    });
    await controller.checkForUpdates({ userInitiated: true });
    expect(dialog.calls[0].title).toMatch(/up to date/i);
  });
});
