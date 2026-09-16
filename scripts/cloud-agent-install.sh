#!/usr/bin/env bash
# Idempotent dependency setup for the Cursor Cloud Agent (Linux) environment.
# Kept out of package.json so it does not change build-script behavior on other
# platforms (notably Windows CI, which has no C++ toolchain to compile addons).
set -euo pipefail

# Install JS dependencies from the committed lockfile.
pnpm install --frozen-lockfile

# pnpm 10 blocks dependency build scripts by default, so better-sqlite3's native
# addon is not compiled during install and `pnpm rebuild` is a no-op. Compile it
# here so the server uses the native SQLite backend. The app otherwise falls back
# to Node's built-in node:sqlite, so this is a best-effort optimization.
if ! node -e "const D = require('better-sqlite3'); new D(':memory:').close();" >/dev/null 2>&1; then
  pkg_dir="$(node -p "require('path').dirname(require.resolve('better-sqlite3/package.json'))")"
  npm --prefix "$pkg_dir" run build-release
fi

# Chromium for the Remix Playwright e2e suite (test:e2e:remix).
pnpm exec playwright install chromium
