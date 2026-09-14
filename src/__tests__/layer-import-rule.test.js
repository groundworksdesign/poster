const fs = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, '..');
const LAYER_DIRS = [
  path.join(SRC_ROOT, 'domain'),
  path.join(SRC_ROOT, 'application'),
];

const SOURCE_EXT = /\.(cjs|mjs|js|jsx|ts|tsx)$/;
const TEST_EXT = /\.(test|spec|edge\.test)\./;

/** Specifiers that pull framework stacks into domain/application. */
const FORBIDDEN_PACKAGE = /^(?:@remix-run(?:\/|$)|remix(?:\/|$)|electron(?:\/|$)|@electron(?:\/|$)|playwright(?:\/|$)|@playwright(?:\/|$)|electron-playwright(?:\/|$))/;

/** Relative escapes into outer rings / e2e. */
const FORBIDDEN_RELATIVE =
  /(?:^|\/)(?:adapters|presentation)(?:\/|$)|(?:^|\/)(?:tests\/)?e2e(?:\/|$)|(?:^|\.\.\/)+adapters(?:\/|$)|(?:^|\.\.\/)+presentation(?:\/|$)/;

const IMPORT_SPEC =
  /(?:import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?|export\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)|require\s*\(\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;

function walkSources(dir, { includeTests = false } = {}, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSources(full, { includeTests }, out);
      continue;
    }
    if (!SOURCE_EXT.test(entry.name)) continue;
    if (!includeTests && TEST_EXT.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function collectSpecs(source) {
  const specs = [];
  const cleaned = stripComments(source);
  let match;
  IMPORT_SPEC.lastIndex = 0;
  while ((match = IMPORT_SPEC.exec(cleaned)) !== null) {
    specs.push({ spec: match[1], index: match.index });
  }
  return specs;
}

function violationsForFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const relative = path.relative(SRC_ROOT, filePath);
  const found = [];
  for (const { spec } of collectSpecs(source)) {
    if (FORBIDDEN_PACKAGE.test(spec) || FORBIDDEN_RELATIVE.test(spec)) {
      found.push(`${relative}: forbidden import "${spec}"`);
    }
  }
  return found;
}

describe('clean-architecture layer import rule (REQ-002)', () => {
  const productionFiles = LAYER_DIRS.flatMap((dir) => walkSources(dir));
  const allLayerFiles = LAYER_DIRS.flatMap((dir) =>
    walkSources(dir, { includeTests: true }),
  );

  it('finds production sources under src/domain and src/application', () => {
    expect(productionFiles.length).toBeGreaterThan(0);
    expect(
      productionFiles.some((f) => f.includes(`${path.sep}domain${path.sep}`)),
    ).toBe(true);
    expect(
      productionFiles.some((f) =>
        f.includes(`${path.sep}application${path.sep}`),
      ),
    ).toBe(true);
  });

  it('does not import Remix, Electron, Playwright, or outer rings (production)', () => {
    const violations = productionFiles.flatMap(violationsForFile);
    expect(violations).toEqual([]);
  });

  it('does not import Remix, Electron, Playwright, or outer rings (including colocated tests)', () => {
    const violations = allLayerFiles.flatMap(violationsForFile);
    expect(violations).toEqual([]);
  });
});
