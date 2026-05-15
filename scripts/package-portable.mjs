#!/usr/bin/env node
/**
 * scripts/package-portable.mjs
 *
 * Packages the Poster application into a self-contained portable zip.
 * The zip contains the Remix production build, server, public assets, and
 * production node_modules rebuilt for the current OS and Node version.
 *
 * Usage:
 *   node scripts/package-portable.mjs [--sha <git-sha>] [--tag <release-tag>]
 *
 * Output:
 *   dist/poster-portable-<os>-<sha>.zip
 *   dist/poster-portable-<os>-<tag>-<sha>.zip  (when --tag is set)
 *
 * Prerequisites:
 *   - pnpm run build:remix must have been run first (build/ must exist)
 *   - pnpm must be available on PATH (falls back to npm)
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  process.stdout.write(msg + "\n");
}

function die(msg) {
  process.stderr.write("ERROR: " + msg + "\n");
  process.exit(1);
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: "inherit", cwd: opts.cwd || ROOT, ...opts });
  } catch (e) {
    die(`Command failed: ${cmd}\n${e.message}`);
  }
}

function runCapture(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd: opts.cwd || ROOT }).trim();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
let shaOverride = null;
let tagOverride = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--sha" && args[i + 1]) {
    shaOverride = args[++i];
  } else if (args[i] === "--tag" && args[i + 1]) {
    tagOverride = args[++i];
  }
}

// ---------------------------------------------------------------------------
// OS slug
// ---------------------------------------------------------------------------

const OS_SLUGS = { linux: "linux", win32: "win", darwin: "mac" };
const osSlug = OS_SLUGS[process.platform] ?? process.platform;

// ---------------------------------------------------------------------------
// Git SHA
// ---------------------------------------------------------------------------

const gitSha =
  shaOverride ||
  runCapture("git rev-parse --short HEAD") ||
  "unknown";

// ---------------------------------------------------------------------------
// Validate prerequisites
// ---------------------------------------------------------------------------

const buildDir = join(ROOT, "build");
if (!existsSync(buildDir)) {
  die(
    "build/ directory not found. Run `pnpm run build:remix` before packaging.\n" +
      "  Expected: " + buildDir
  );
}

const serverDir = join(ROOT, "server");
if (!existsSync(serverDir)) {
  die("server/ directory not found at: " + serverDir);
}

// ---------------------------------------------------------------------------
// Staging directory
// ---------------------------------------------------------------------------

const stagingBase = tmpdir();
const stagingDir = join(stagingBase, `poster-portable-staging-${Date.now()}`);
log(`Creating staging directory: ${stagingDir}`);
mkdirSync(stagingDir, { recursive: true });

try {
  // -------------------------------------------------------------------------
  // Copy required files into staging
  // -------------------------------------------------------------------------
  log("Copying build/ ...");
  cpSync(join(ROOT, "build"), join(stagingDir, "build"), { recursive: true });

  log("Copying server/ ...");
  cpSync(join(ROOT, "server"), join(stagingDir, "server"), { recursive: true });

  log("Copying public/ ...");
  cpSync(join(ROOT, "public"), join(stagingDir, "public"), {
    recursive: true,
    filter: (src) => {
      // Exclude generated CRA index.html (Remix serves its own)
      if (src.endsWith("public/index.html")) return false;
      return true;
    },
  });

  log("Copying package.json ...");
  cpSync(join(ROOT, "package.json"), join(stagingDir, "package.json"));

  // Copy lockfile (prefer pnpm, fall back to npm)
  const pnpmLock = join(ROOT, "pnpm-lock.yaml");
  const npmLock = join(ROOT, "package-lock.json");
  if (existsSync(pnpmLock)) {
    log("Copying pnpm-lock.yaml ...");
    cpSync(pnpmLock, join(stagingDir, "pnpm-lock.yaml"));
  } else if (existsSync(npmLock)) {
    log("Copying package-lock.json ...");
    cpSync(npmLock, join(stagingDir, "package-lock.json"));
  }

  // Copy .npmrc if present (needed for pnpm install in staging)
  const npmrc = join(ROOT, ".npmrc");
  if (existsSync(npmrc)) {
    cpSync(npmrc, join(stagingDir, ".npmrc"));
  }

  // -------------------------------------------------------------------------
  // Install production dependencies in staging
  // -------------------------------------------------------------------------
  // NOTE: We use npm (not pnpm) for the staging install because pnpm uses a
  // symlink-based virtual store (.pnpm/) that zip resolves into real files,
  // breaking Node module resolution after unzip. npm ci creates a flat
  // node_modules that survives zip/unzip on all platforms.
  log("Installing production dependencies with npm (flat layout for zip portability)...");

  // npm ci requires package-lock.json; we copied it above if present.
  // If only pnpm-lock.yaml is available, fall back to npm install.
  const hasNpmLockInStaging = existsSync(join(stagingDir, "package-lock.json"));
  if (hasNpmLockInStaging) {
    run("npm ci --omit=dev --ignore-scripts --legacy-peer-deps", { cwd: stagingDir });
  } else {
    run("npm install --omit=dev --ignore-scripts --legacy-peer-deps", { cwd: stagingDir });
  }

  log("Rebuilding better-sqlite3 for current OS...");
  if (existsSync(join(stagingDir, "node_modules", "better-sqlite3"))) {
    run("npm rebuild better-sqlite3", { cwd: stagingDir });
  }

  // -------------------------------------------------------------------------
  // Write PORTABLE.md
  // -------------------------------------------------------------------------
  const portableMd = [
    "# Poster - Portable Build",
    "",
    "## Requirements",
    "",
    "- Node.js LTS (same major version used to build this zip)",
    "  Check the `engines` field in package.json if present.",
    "",
    "## Startup",
    "",
    "```sh",
    "PORT=3000 node server/index.js",
    "# or, if pnpm is installed:",
    "pnpm start",
    "```",
    "",
    "On Windows:",
    "```cmd",
    "set PORT=3000 && node server/index.js",
    "```",
    "",
    "Then open http://localhost:3000 in your browser.",
    "",
    "## SQLite database",
    "",
    "The library database (poster.sqlite) is created in the working directory",
    "on first run. Override with:",
    "",
    "```sh",
    "POSTER_DB_PATH=/path/to/poster.sqlite node server/index.js",
    "```",
    "",
    "## Notes",
    "",
    `This build was produced for OS: ${osSlug}, git SHA: ${gitSha}.` +
      (tagOverride ? ` Release tag: ${tagOverride}.` : ""),
    "The node_modules/ directory was rebuilt for the host OS and Node version",
    "that created this zip. Do not mix node_modules from different operating",
    "systems — always use the zip that matches your target OS.",
    "",
    "## Backup and restore",
    "",
    "To back up your library, copy poster.sqlite to a safe location.",
    "To restore, replace poster.sqlite with your backup before starting the server.",
  ].join("\n");

  writeFileSync(join(stagingDir, "PORTABLE.md"), portableMd, "utf8");
  log("Wrote PORTABLE.md");

  // -------------------------------------------------------------------------
  // Create output zip
  // -------------------------------------------------------------------------
  const distDir = join(ROOT, "dist");
  mkdirSync(distDir, { recursive: true });

  const zipBase = tagOverride
    ? `poster-portable-${osSlug}-${tagOverride}-${gitSha}`
    : `poster-portable-${osSlug}-${gitSha}`;
  const zipName = `${zipBase}.zip`;
  const zipPath = join(distDir, zipName);

  // Remove existing zip with same name
  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }

  log(`Creating zip: ${zipPath}`);

  if (process.platform === "win32") {
    // Windows: use PowerShell Compress-Archive
    // We need to zip contents of stagingDir (not the stagingDir folder itself)
    const psCmd =
      `Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipPath}' -Force`;
    const result = spawnSync("powershell", ["-NoProfile", "-Command", psCmd], {
      stdio: "inherit",
      cwd: stagingDir,
    });
    if (result.status !== 0) {
      die("Compress-Archive failed. Ensure PowerShell is available.");
    }
  } else {
    // Mac/Linux: use zip utility
    // Change into stagingDir so zip paths are relative (no leading temp path)
    const result = spawnSync(
      "zip",
      ["-r", zipPath, "."],
      {
        stdio: "inherit",
        cwd: stagingDir,
      }
    );
    if (result.status !== 0) {
      die("zip command failed. Ensure the `zip` utility is installed.");
    }
  }

  log(`\nPortable zip created successfully:`);
  log(`  ${zipPath}`);
  log(`  OS: ${osSlug}  SHA: ${gitSha}`);

} finally {
  // -------------------------------------------------------------------------
  // Cleanup staging directory
  // -------------------------------------------------------------------------
  log("\nCleaning up staging directory...");
  try {
    rmSync(stagingDir, { recursive: true, force: true });
  } catch {
    process.stderr.write(`Warning: could not clean up staging dir: ${stagingDir}\n`);
  }
}
