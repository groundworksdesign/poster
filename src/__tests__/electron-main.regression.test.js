const fs = require('fs');
const path = require('path');

const mainSource = fs.readFileSync(
  path.join(__dirname, '../../electron/main.cjs'),
  'utf8',
);

const portableSource = fs.readFileSync(
  path.join(__dirname, '../../scripts/package-portable.mjs'),
  'utf8',
);

// All Electron installers from electron-builder.yml share electron/main.cjs:
// macOS DMG (x64 + arm64), Windows NSIS (x64), Linux deb + AppImage (x64).
const ELECTRON_INSTALLER_TARGETS = [
  'macOS DMG (x64, arm64)',
  'Windows NSIS (x64)',
  'Linux deb + AppImage (x64)',
];

describe('electron/main.cjs launch safety (all Electron installers)', () => {
  it.each(ELECTRON_INSTALLER_TARGETS)(
    'guards apply to %s',
    () => {
      expect(mainSource).toMatch(/ELECTRON_RUN_AS_NODE:\s*['"]1['"]/);
      expect(mainSource).toMatch(/requestSingleInstanceLock\(\)/);
    },
  );

  it('runs the embedded server child with ELECTRON_RUN_AS_NODE in startServer', () => {
    const startServerBlock = mainSource.slice(
      mainSource.indexOf('async function startServer'),
      mainSource.indexOf('async function startServer') + 1200,
    );
    expect(startServerBlock).toMatch(/spawn\(/);
    expect(startServerBlock).toMatch(/process\.execPath/);
    expect(startServerBlock).toMatch(/ELECTRON_RUN_AS_NODE:\s*['"]1['"]/);
  });

  it('quits duplicate GUI launches via single-instance lock', () => {
    expect(mainSource).toMatch(/if\s*\(\s*!gotTheLock\s*\)\s*\{[\s\S]*?app\.quit\(\)/);
    expect(mainSource).toMatch(/second-instance/);
  });

  it('does not relaunch or self-spawn the GUI on startup', () => {
    expect(mainSource).not.toMatch(/app\.relaunch\(\)/);
    expect(mainSource).not.toMatch(/spawn\(\s*process\.execPath\s*,\s*\[\s*__filename/);
  });

  it('recreates the window on macOS activate without relaunching', () => {
    const activateBlock = mainSource.slice(mainSource.indexOf("app.on('activate'"));
    expect(activateBlock).toMatch(/createWindow\(serverPort\)/);
    expect(activateBlock).not.toMatch(/app\.relaunch\(\)/);
  });
});

describe('portable zip launch path (all OS portable targets)', () => {
  it('does not bundle or invoke electron/main.cjs', () => {
    expect(portableSource).not.toMatch(/electron\/main\.cjs/);
    expect(portableSource).not.toMatch(/process\.execPath/);
  });

  it('documents system Node startup instead of Electron self-spawn', () => {
    expect(portableSource).toMatch(/node server\/index\.js/);
  });
});
