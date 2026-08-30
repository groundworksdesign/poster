const fs = require('fs');
const path = require('path');

const mainSource = fs.readFileSync(
  path.join(__dirname, '../../electron/main.cjs'),
  'utf8',
);

describe('electron/main.cjs launch safety', () => {
  it('runs the embedded server with ELECTRON_RUN_AS_NODE', () => {
    expect(mainSource).toMatch(/ELECTRON_RUN_AS_NODE:\s*['"]1['"]/);
  });

  it('requests a single-instance lock before starting', () => {
    expect(mainSource).toMatch(/requestSingleInstanceLock\(\)/);
  });

  it('does not relaunch the app on macOS activate', () => {
    expect(mainSource).not.toMatch(/app\.relaunch\(\)/);
  });
});
