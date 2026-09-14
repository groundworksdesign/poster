#!/usr/bin/env bash
set -euo pipefail

# package-portable.sh
# Creates a portable zip containing build/, runtime adapters, public/, package.json, pnpm-lock.yaml,
# and production node_modules rebuilt for the current runner OS. Produces:
#   poster-portable-<os>-<sha>.zip

# Helpers
err() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "INFO: $*"; }

ROOT=""
if git_root=$(git rev-parse --show-toplevel 2>/dev/null); then
  ROOT="$git_root"
else
  ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi

cd "$ROOT"

# Determine OS slug
_uname=$(uname -s || true)
case "$_uname" in
  Linux) OS="linux";;
  Darwin) OS="mac";;
  CYGWIN*|MINGW*|MSYS*|Windows_NT) OS="win";;
  *) OS="unix";;
esac

# Arch
_arch=$(uname -m || true)
case "$_arch" in
  x86_64|amd64) ARCH="x64";;
  aarch64|arm64) ARCH="arm64";;
  *) ARCH="$_arch";;
esac

# SHA
if git rev-parse --git-dir >/dev/null 2>&1; then
  SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "no-git")
else
  SHA=$(date +%s)
fi

OUTNAME="poster-portable-${OS}-${SHA}.zip"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

info "Creating portable package in $TMPDIR"

# Ensure required dirs/files exist (build may be missing for dev)
for p in build public package.json pnpm-lock.yaml src/adapters/persistence/server.js src/adapters/realtime/posterSessionRelay.js src/domain/posterSessionGraph.cjs; do
  if [ ! -e "$p" ]; then
    echo "WARNING: $p not found in repo root; continuing but archive may be incomplete"
  fi
done

# Copy files
info "Copying files"
mkdir -p "$TMPDIR/artifact"
cp -a build "$TMPDIR/artifact/" 2>/dev/null || true
mkdir -p "$TMPDIR/artifact/src/adapters/persistence" "$TMPDIR/artifact/src/adapters/realtime" "$TMPDIR/artifact/src/domain"
cp -a src/adapters/persistence/server.js "$TMPDIR/artifact/src/adapters/persistence/" 2>/dev/null || true
cp -a src/adapters/realtime/posterSessionRelay.js "$TMPDIR/artifact/src/adapters/realtime/" 2>/dev/null || true
cp -a src/domain/posterSessionGraph.cjs "$TMPDIR/artifact/src/domain/" 2>/dev/null || true
cp -a public "$TMPDIR/artifact/" 2>/dev/null || true
if [ -f package.json ]; then cp package.json "$TMPDIR/artifact/"; fi
if [ -f pnpm-lock.yaml ]; then cp pnpm-lock.yaml "$TMPDIR/artifact/"; fi

# Prepare node_modules: install production dependencies in temp artifact
cd "$TMPDIR/artifact"

# Prefer pnpm, fall back to npm
if command -v pnpm >/dev/null 2>&1; then
  info "Using pnpm to install production dependencies"
  # create minimal package manifest if none (should have been copied)
  if [ ! -f package.json ]; then
    err "package.json not found in repo root; cannot install dependencies"
  fi
  # Use --prod to install production dependencies only
  pnpm install --prod --frozen-lockfile || pnpm install --prod || true
  # Rebuild native modules if available
  pnpm rebuild better-sqlite3 || true
elif command -v npm >/dev/null 2>&1; then
  info "pnpm not found; falling back to npm"
  if [ ! -f package.json ]; then
    err "package.json not found in repo root; cannot install dependencies"
  fi
  npm install --only=production || true
  npm rebuild better-sqlite3 --update-binary || true
else
  err "neither pnpm nor npm found in PATH; cannot install node_modules"
fi

# Add PORTABLE.md
cat > PORTABLE.md <<'EOF'
Portable Poster

To run the portable server:

  PORT=3000 node src/adapters/persistence/server.js

Or using pnpm (if installed):

  PORT=3000 pnpm start

Notes:
- This archive contains the Remix build, persistence/realtime adapters, public assets, package.json, lockfile, and production node_modules built on the runner OS.
- Native modules (e.g. better-sqlite3) are platform-specific. Use the archive on the same OS family it was built on.
EOF

# Ensure zip exists
if ! command -v zip >/dev/null 2>&1; then
  err "zip command not found; please install zip to create .zip archives"
fi

# Create the zip containing artifact/* and PORTABLE.md (place at repo root)
cd "$TMPDIR"
zip -r "$OUTNAME" artifact PORTABLE.md >/dev/null
mv "$OUTNAME" "$ROOT/"
info "Created $ROOT/$OUTNAME"

# Done
exit 0
