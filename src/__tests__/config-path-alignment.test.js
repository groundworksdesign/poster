const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('config/CI/script path alignment (REQ-003)', () => {
  const pkg = readJson('package.json');
  const remix = require(path.join(ROOT, 'remix.config.js'));
  const electronBuilder = readText('electron-builder.yml');
  const portableScript = readText('scripts/package-portable.mjs');
  const readme = readText('README.md');

  it('points package.json main and start scripts at adapters', () => {
    expect(pkg.main).toBe('src/adapters/electron/main.cjs');
    expect(pkg.scripts.start).toMatch(/src\/adapters\/persistence\/server\.js/);
    expect(pkg.scripts['start:remix']).toMatch(
      /src\/adapters\/persistence\/server\.js/,
    );
    expect(fs.existsSync(path.join(ROOT, pkg.main))).toBe(true);
    expect(
      fs.existsSync(path.join(ROOT, 'src/adapters/persistence/server.js')),
    ).toBe(true);
  });

  it('points remix appDirectory at src/adapters/remix', () => {
    expect(remix.appDirectory).toBe('src/adapters/remix');
    expect(fs.existsSync(path.join(ROOT, remix.appDirectory))).toBe(true);
  });

  it('wires e2e scripts to tests/e2e Playwright configs', () => {
    expect(pkg.scripts['test:e2e']).toMatch(/tests\/e2e\//);
    expect(pkg.scripts['test:e2e:remix']).toMatch(/tests\/e2e\//);
    expect(pkg.scripts['test:e2e:electron']).toMatch(/tests\/e2e\//);
  });

  it('packages Electron/portable entries from adapter paths', () => {
    expect(electronBuilder).toMatch(/src\/adapters\/electron\/\*\*/);
    expect(electronBuilder).toMatch(/src\/adapters\/persistence\/server\.js/);
    expect(portableScript).toMatch(/adapters.*persistence.*server\.js/s);
    expect(portableScript).toMatch(
      /PORT=3000 node src\/adapters\/persistence\/server\.js/,
    );
    expect(portableScript).not.toMatch(/server\/index\.js/);
    expect(portableScript).not.toMatch(/electron\/main\.cjs/);
  });

  it('keeps operator README free of stale root electron/server paths', () => {
    expect(readme).not.toMatch(/`electron\/main\.cjs`/);
    expect(readme).not.toMatch(/node server\/index\.js/);
    expect(readme).not.toMatch(/node server\\index\.js/);
    expect(readme).toMatch(/src\/adapters\/electron\/main\.cjs/);
    expect(readme).toMatch(/src\/adapters\/persistence\/server\.js/);
    expect(readme).toMatch(/tests\/e2e\/playwright/);
  });
});
