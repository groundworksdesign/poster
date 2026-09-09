import fs from 'fs';
import os from 'os';
import path from 'path';

const SETTINGS_FILE = 'library-settings.json';
const MIGRATION_MARKER = '.poster-library-migrated';
type LibraryEnv = Readonly<Record<string, string | undefined>>;

export function resolvePosterHome(env: LibraryEnv = process.env, homeDir = os.homedir()): string {
  return path.resolve(env.POSTER_HOME || path.join(homeDir, '.poster'));
}

function expandHome(value: string, homeDir = os.homedir()): string {
  if (value === '~') return homeDir;
  if (value.startsWith(`~${path.sep}`)) return path.join(homeDir, value.slice(2));
  return value;
}

function isUsableLibraryRoot(root: string): boolean {
  try {
    return !fs.existsSync(root) || fs.statSync(root).isDirectory();
  } catch {
    return false;
  }
}

export function resolveLibraryRoot(
  env: LibraryEnv = process.env,
  homeDir = os.homedir(),
): string {
  if (env.POSTER_LIBRARY_PATH) return path.resolve(expandHome(env.POSTER_LIBRARY_PATH, homeDir));
  const settingsPath = path.join(resolvePosterHome(env, homeDir), SETTINGS_FILE);
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as { libraryRoot?: unknown };
    if (typeof settings.libraryRoot === 'string' && settings.libraryRoot.trim()) {
      const configured = path.resolve(expandHome(settings.libraryRoot, homeDir));
      if (isUsableLibraryRoot(configured)) return configured;
    }
  } catch {
    // Missing or invalid settings use the durable default.
  }
  return resolvePosterHome(env, homeDir);
}

export function librarySettingsPath(
  env: LibraryEnv = process.env,
  homeDir = os.homedir(),
): string {
  return path.join(resolvePosterHome(env, homeDir), SETTINGS_FILE);
}

export function readLibraryRoot(): string {
  return resolveLibraryRoot();
}

export function writeLibraryRoot(root: string): string {
  const trimmed = root.trim();
  if (!trimmed) throw new Error('Library path is required');
  const expanded = path.resolve(expandHome(trimmed));
  if (fs.existsSync(expanded) && !fs.statSync(expanded).isDirectory()) {
    throw new Error('Library path must be a directory');
  }
  fs.mkdirSync(expanded, { recursive: true });
  const settingsPath = librarySettingsPath();
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  const tempPath = `${settingsPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify({ libraryRoot: expanded }, null, 2));
  fs.renameSync(tempPath, settingsPath);
  return expanded;
}

function hasLibraryData(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

/** Copy legacy cwd data once, without ever deleting or modifying its source. */
export function migrateLegacyLibrary(
  root = resolveLibraryRoot(),
  cwd = process.cwd(),
  env: LibraryEnv = process.env,
): void {
  if (env.POSTER_DB_PATH || env.POSTER_LIBRARY_JSON_PATH) return;
  // Keep the marker in the user-owned settings directory, not the active
  // library root, so changing roots never re-runs cwd migration.
  const marker = path.join(resolvePosterHome(env), MIGRATION_MARKER);
  if (fs.existsSync(marker)) return;

  fs.mkdirSync(root, { recursive: true });
  const destinationDb = path.join(root, 'poster.sqlite');
  const destinationJson = path.join(root, 'poster.library.json');
  const sourceDb = path.join(cwd, 'poster.sqlite');
  const sourceJson = path.join(cwd, 'poster.library.json');

  if (!hasLibraryData(destinationDb) && !hasLibraryData(destinationJson)) {
    if (hasLibraryData(sourceDb) && path.resolve(sourceDb) !== path.resolve(destinationDb)) {
      fs.copyFileSync(sourceDb, destinationDb);
      for (const suffix of ['-wal', '-shm']) {
        const sidecar = `${sourceDb}${suffix}`;
        if (fs.existsSync(sidecar)) fs.copyFileSync(sidecar, `${destinationDb}${suffix}`);
      }
    } else if (hasLibraryData(sourceJson) && path.resolve(sourceJson) !== path.resolve(destinationJson)) {
      fs.copyFileSync(sourceJson, destinationJson);
    }
  }
  fs.writeFileSync(marker, new Date().toISOString());
}

export function libraryPaths(root = resolveLibraryRoot()) {
  return {
    root,
    db: process.env.POSTER_DB_PATH || path.join(root, 'poster.sqlite'),
    json: process.env.POSTER_LIBRARY_JSON_PATH || path.join(root, 'poster.library.json'),
  };
}
