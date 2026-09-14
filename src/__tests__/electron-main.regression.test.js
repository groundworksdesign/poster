const fs = require('fs');
const path = require('path');

const mainSource = fs.readFileSync(
  path.join(__dirname, '../../electron/main.cjs'),
  'utf8',
);

const preloadSource = fs.readFileSync(
  path.join(__dirname, '../../electron/preload.cjs'),
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

  it('recreates or focuses Home on macOS activate without relaunching', () => {
    const activateBlock = mainSource.slice(mainSource.indexOf("app.on('activate'"));
    expect(activateBlock).toMatch(/ensureHomeWindow\(serverPort\)/);
    expect(activateBlock).not.toMatch(/app\.relaunch\(\)/);
  });

  it('only kills the server on window-all-closed for non-macOS', () => {
    const closedBlock = mainSource.slice(
      mainSource.indexOf("app.on('window-all-closed'"),
      mainSource.indexOf("app.on('activate'"),
    );
    expect(closedBlock).toMatch(
      /if\s*\(\s*process\.platform\s*!==\s*['"]darwin['"]\s*\)\s*\{[\s\S]*killServer\(\)/,
    );
  });

  it('never creates a second Home: ensureHomeWindow + window-open home deny', () => {
    expect(mainSource).toMatch(/function ensureHomeWindow/);
    expect(mainSource).toMatch(/shouldCreateHomeWindow/);
    expect(mainSource).toMatch(/setWindowOpenHandler/);
    expect(mainSource).toMatch(/classifyOpenUrl/);
    expect(mainSource).toMatch(/present-bare/);
  });

  it('allows about:blank Present placeholders with preload (first-open hydrate)', () => {
    expect(mainSource).toMatch(/present-blank/);
    expect(mainSource).toMatch(
      /kind === 'deck' \|\| kind === 'present-session' \|\| kind === 'present-blank'/,
    );
  });

  it('fails fast when packaged node_modules/express is missing', () => {
    expect(mainSource).toMatch(/node_modules['"].*express/);
    expect(mainSource).toMatch(/missing node_modules\/express/);
  });

  it('fails fast if the server child exits before ready', () => {
    expect(mainSource).toMatch(/Server exited before becoming ready/);
  });

  it('exposes a native folder picker IPC for Home Change... (no window.prompt)', () => {
    expect(mainSource).toMatch(
      /ipcMain\.handle\(['"]poster:pick-library-folder['"]/,
    );
    expect(mainSource).toMatch(/dialog\.showOpenDialog/);
    expect(mainSource).toMatch(/\[['"]openDirectory['"], ['"]createDirectory['"]\]/);
    expect(preloadSource).toMatch(/pickLibraryFolder:/);
    expect(preloadSource).toMatch(/['"]poster:pick-library-folder['"]/);
  });
});

describe('electron packaging includes production node_modules', () => {
  const builderYml = fs.readFileSync(
    path.join(__dirname, '../../electron-builder.yml'),
    'utf8',
  );
  const prepareSrc = fs.readFileSync(
    path.join(__dirname, '../../scripts/prepare-electron-pack.cjs'),
    'utf8',
  );

  it('maps prepared prod node_modules into the packaged app', () => {
    expect(builderYml).toMatch(/dist\/electron-prod-modules\/node_modules/);
    expect(builderYml).toMatch(/to:\s*node_modules/);
  });

  it('prepare script installs slim flat runtime deps with express', () => {
    expect(prepareSrc).toMatch(/shamefully-hoist/);
    expect(prepareSrc).toMatch(/express/);
    expect(prepareSrc).toMatch(/RUNTIME_DEP_NAMES/);
    const runtimeBlock = prepareSrc.slice(
      prepareSrc.indexOf('RUNTIME_DEP_NAMES'),
      prepareSrc.indexOf('];', prepareSrc.indexOf('RUNTIME_DEP_NAMES')) + 2,
    );
    expect(runtimeBlock).not.toMatch(/react-scripts/);
    expect(runtimeBlock).not.toMatch(/@testing-library/);
  });

  it('ad-hoc re-signs unsigned mac builds after pack', () => {
    expect(builderYml).toMatch(/afterPack:\s*scripts\/mac-adhoc-sign\.cjs/);
    const adhocSrc = fs.readFileSync(
      path.join(__dirname, '../../scripts/mac-adhoc-sign.cjs'),
      'utf8',
    );
    expect(adhocSrc).toMatch(/CSC_LINK/);
    expect(adhocSrc).toMatch(/codesign/);
    expect(adhocSrc).toMatch(/--sign', '-'/);
    expect(adhocSrc).toMatch(/hasSigningIdentity|trim\(\)/);
  });

  it('strips empty CSC env before electron-builder (Release unsigned mac)', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'),
    );
    expect(pkg.scripts['build:electron']).toMatch(/run-electron-builder\.cjs/);
    const clearer = fs.readFileSync(
      path.join(__dirname, '../../scripts/clear-empty-csc-env.cjs'),
      'utf8',
    );
    expect(clearer).toMatch(/CSC_LINK/);
    expect(clearer).toMatch(/trim/);
  });

  it('allows window.open child windows in Electron main', () => {
    expect(mainSource).toMatch(/setWindowOpenHandler/);
    expect(mainSource).toMatch(/did-create-window/);
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
