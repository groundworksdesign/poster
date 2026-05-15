# Poster

Poster is a slide presentation tool with two main views: a **deck builder** (operator) and a **presentation** (audience or projector). The builder sends the current slide to the presentation over a browser **BroadcastChannel**, so both views must run in the same browser (typically two windows or a window and a tab).

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/) (or use `npm` with the equivalent commands)

## Getting started

Install dependencies from the project root:

```bash
pnpm install
```

## How to run the app

### Full app (recommended): Remix development server

Use this when you need server routes (for example **library** save/load, backup, and restore backed by SQLite):

```bash
pnpm dev
```

This runs `remix dev`. Open **http://localhost:3000** (unless the CLI prints a different URL). The home page at `/` explains the workflow and links to the deck builder and presentation.

### Production-style server

Build the Remix app, then start the Express server:

```bash
pnpm run build:remix
pnpm start
```

The server listens on **port 3000** by default, or **PORT** if set.

### Create React App only (UI development)

If you only need the client bundle without Remix server APIs:

```bash
pnpm run start:cra
```

This copies `public/cra-index.html` to `public/index.html` (Create React App’s template) before starting webpack. **Do not leave a committed `public/index.html`**: Remix’s dev server and `remix-serve` treat `public` as static files and would serve that document for `/`, which looks like a blank page (empty `#root`, no Remix scripts).

Library and other `POST` routes will not be available in CRA-only mode; use the Remix dev server for full functionality.

**Library API from the browser:** Remix routes under `/library` render a small UI shell, so plain `fetch('/library')` receives an HTML document, not JSON. The deck UI uses `?_data=<routeId>` (see `src/utils/remixDataUrl.ts`) so loaders and actions return JSON. If list/open/delete misbehave, confirm you are not calling those URLs without `_data` from custom code.

## How to use Poster

1. **Deck builder** (`/deck`): Load a slide deck (JSON), import a song (XML), or use the **library** (when the full server is running). Pick slides and send them to the presentation.
2. **Presentation** (`/presentation`): Open this on your projector or second monitor—fullscreen it there. It shows whatever the builder last sent.
3. Keep both views open in the **same browser** so the live channel works. Use the on-screen controls or keyboard shortcuts in the builder to move through slides or song lyrics.

The in-app home page (`/`) includes the same overview and links to open the deck builder (new tab) and presentation (new window).

### SQLite library storage

The app stores the local library in **`poster.sqlite`** next to the process working directory (override with **`POSTER_DB_PATH`**).

1. **`better-sqlite3`** is used when the native addon loads (typical on Node LTS with a successful `pnpm rebuild better-sqlite3`).
2. If that fails (for example Node 24+ before a matching prebuild), the server automatically uses Node’s built-in **`node:sqlite`** (`DatabaseSync`) so the same `poster.sqlite` file still works—no extra install (startup stays quiet; set **`POSTER_SQLITE_LOG_BACKEND=1`** to log which driver was chosen).
3. If both fail, the app falls back to **`poster.library.json`**.

To prefer rebuilding the native module on supported Node versions:

```bash
pnpm run rebuild:sqlite
```

## Other scripts

| Command | Description |
| --- | --- |
| `pnpm test` | Jest tests (interactive watch by default) |
| `pnpm run test:e2e` | Playwright end-to-end tests (see `playwright.config.ts`) |
| `pnpm run test:e2e:remix` | Playwright against Remix dev (`playwright.remix.config.ts`) |
| `pnpm run build` | CRA production build to `build/` |
| `pnpm run build:remix` | Remix production build |
| `pnpm run package:portable` | Zip a **portable** server bundle to `dist/` (requires `build/`; see below) |
| `pnpm run build:electron` | Build desktop **installers** with electron-builder (`dist/electron/`) |
| `pnpm run electron` | Launch the Electron shell against this repo (same `main` as packaging) |
| `pnpm run eject` | CRA eject (irreversible); rarely needed |

## Portable zip packaging (local)

The portable archive is meant to be built on the **same OS** you deploy to: `better-sqlite3` is native, so do not copy `node_modules` from Windows into a macOS zip (CI builds one zip per runner).

**Canonical packager** (used by GitHub Actions): `scripts/package-portable.mjs`.

From the repo root, after a production Remix build:

```bash
pnpm install
pnpm rebuild better-sqlite3
pnpm run build:remix
pnpm run package:portable
```

Optional CLI (short git SHA and release tag are embedded in the filename when passed):

```bash
node scripts/package-portable.mjs --sha "$(git rev-parse --short HEAD)"
node scripts/package-portable.mjs --sha abc1234 --tag v0.2.0
```

**Output:** `dist/poster-portable-<linux|win|mac>-<sha>.zip`, or `dist/poster-portable-<os>-<tag>-<sha>.zip` when `--tag` is set.

**Run after unzip:** see `PORTABLE.md` inside the archive (typically `PORT=3000 node server/index.js`). On Windows, use `set PORT=3000 && node server\index.js`.

A legacy shell helper `scripts/package-portable.sh` may still exist; prefer `package-portable.mjs` and `pnpm run package:portable` so behavior matches CI.

## Electron installers (local)

Configuration lives in `electron-builder.yml` (targets: macOS DMG x64/arm64, Windows NSIS x64, Linux deb + AppImage x64). `npmRebuild: true` makes electron-builder rebuild native modules for Electron’s ABI.

```bash
pnpm install
pnpm rebuild better-sqlite3
pnpm run build:remix
pnpm run build:electron
```

Installer files land under **`dist/electron/`** (for example `.dmg`, `.exe`, `.deb`, `.AppImage`). Names follow `artifactName` in `electron-builder.yml` (by default `Poster-<version>-<os>-<arch>.<ext>` using `package.json` `version`).

Local builds and CI use `CSC_IDENTITY_AUTO_DISCOVERY=false`, so macOS and Windows artifacts are **unsigned** unless you configure signing separately.

## CI: PR workflow artifacts

The **PR Build** workflow (`.github/workflows/pr.yml`) runs on every pull request.

- **Portable zip** job matrix (`ubuntu-latest`, `windows-latest`, `macos-latest`) uploads one zip per OS with artifact names like `poster-portable-<runner>-<full-commit-sha>`.
- **Electron installers** job matrix uploads staged installers (DMG, NSIS exe, deb, AppImage when produced) with names like `poster-electron-<runner>-pr-<PR#>-<full-commit-sha>`.

Open the PR on GitHub, then **Checks** → select the workflow run → **Artifacts** (retention is limited; see the workflow `retention-days`).

## Releases: semver tags and GitHub Release assets

The **Release** workflow (`.github/workflows/release.yml`) runs when you push a **semver tag** matching `v*.*.*` (examples: `v0.2.0`, `v1.0.0`).

1. Align `package.json` `version` with the release you are tagging (e.g. `0.2.0` for tag `v0.2.0`) so filenames and the shipped app version stay consistent.
2. Create and push the tag:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. The workflow builds the same **portable zips** and **Electron installers** as PR CI, then the `publish-release` job attaches everything to the **GitHub Release** for that tag (via `softprops/action-gh-release`).

Intermediate artifacts use names containing `poster-portable-release-...` and `poster-electron-release-...`; published release assets are the bundled files from those jobs.

## Learn more

This repo includes both [Create React App](https://github.com/facebook/create-react-app) and [Remix](https://remix.run/) tooling. See their documentation for advanced configuration.
