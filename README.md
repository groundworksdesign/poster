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

Live Present behavior:

- **Start / Previous / Next / Go** move the program and update the deck's **on-program thumbnail** (a preview of the exact program output, shown with the Presentation controls).
- **End** blanks the program output (no title/body on Present) and clears the thumbnail; **Start** after End resumes at the first slide.
- Closing a **Present** window removes it from the deck's Present window list, so stale windows are never sent to and closing one of several Present windows leaves the others intact.

The in-app home page (`/`) includes the same overview and links to open the deck builder (new tab) and presentation (new window). Present windows open from the deck — Home has no bare "Open Present" action.

### SQLite library storage

The app stores its durable data under **`~/.poster`** by default (override the durable home with **`POSTER_HOME`**, the active library root with **`POSTER_LIBRARY_PATH`**, or an individual store file with **`POSTER_DB_PATH`** / `POSTER_LIBRARY_JSON_PATH`). The Home page's **Change...** control re-points the library to another folder (persisted in `library-settings.json`) and leaves the previous folder untouched. In the packaged Electron app the control uses a native folder picker; in a plain browser it prompts for the path. A legacy `poster.sqlite` or `poster.library.json` in the process working directory is copied to the durable library once when the durable library is first initialized (a marker under the home prevents re-runs); the source is never deleted.

The selected **theme** also persists in the same durable home at **`~/.poster/theme.json`** and is restored for Home, deck, and Present windows across a full quit and relaunch.

1. **`better-sqlite3`** is used when the native addon loads (typical on Node LTS with a successful `pnpm rebuild better-sqlite3`).
2. If that fails (for example Node 24+ before a matching prebuild), the server automatically uses Node’s built-in **`node:sqlite`** (`DatabaseSync`) so the same `poster.sqlite` file still works—no extra install (startup stays quiet; set **`POSTER_SQLITE_LOG_BACKEND=1`** to log which driver was chosen).
3. If both fail, the app falls back to **`poster.library.json`** in the active library folder.

To prefer rebuilding the native module on supported Node versions:

```bash
pnpm run rebuild:sqlite
```

## Other scripts

| Command | Description |
| --- | --- |
| `pnpm test` | Jest tests (interactive watch by default) |
| `pnpm run test:e2e` | Playwright end-to-end tests (see `tests/e2e/playwright.config.ts`) |
| `pnpm run test:e2e:remix` | Playwright against Remix dev (`tests/e2e/playwright.remix.config.ts`) — unit/smoke for Present, theme, thumbnail, library |
| `pnpm run test:e2e:electron` | Playwright Electron smoke (`tests/e2e/playwright.electron.config.ts`) — packaged app at the real `src/adapters/electron/main.cjs`: End blank, Present close-list cleanup, library default `~/.poster` + re-point leave-old, Home guard, theme relaunch |
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

**Run after unzip:** see `PORTABLE.md` inside the archive (typically `PORT=3000 node src/adapters/persistence/server.js`). On Windows, use `set PORT=3000 && node src\adapters\persistence\server.js`.

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

**macOS Gatekeeper:** Browser-downloaded unsigned DMGs often show “Poster.app is damaged…” (quarantine + ad-hoc signature), not a mild “unknown developer” prompt. Clear quarantine with `xattr -cr` as in [`docs/macos-install-unsigned.txt`](docs/macos-install-unsigned.txt). On macOS 15 Sequoia+, Control-click → Open no longer bypasses Gatekeeper for unsigned apps—use **System Settings → Privacy & Security → Open Anyway** after the first blocked open. A normal install dialog requires an Apple **Developer ID** certificate and **notarization** (not configured until those secrets exist).

**Updates:** Packaged Windows/Linux builds can download and install newer GitHub Releases in-app. macOS shows a new-version alert and opens the Releases page (manual DMG + Gatekeeper steps above). See [`docs/auto-update.md`](docs/auto-update.md).

**Packaged AppImage residual risk / Jack checklist:** see [`docs/appimage-residual-risk.md`](docs/appimage-residual-risk.md). Automated Electron Playwright smoke is not a substitute for a manual AppImage cold-open pass.

## CI: PR workflow artifacts

The **PR Build** workflow (`.github/workflows/pr.yml`) runs on pull requests that change application code, tests, package manifests, build config, or `.github/workflows/**`. Docs/license/markdown-only changes are ignored so they do not build portable zips or Electron installers.

- **Portable zip** job matrix (`ubuntu-latest`, `windows-latest`, `macos-latest`) uploads one zip per OS with artifact names like `poster-portable-<runner>-<full-commit-sha>`.
- **Electron installers** job matrix uploads staged installers (DMG, NSIS exe, deb, AppImage when produced) with names like `poster-electron-<runner>-pr-<PR#>-<full-commit-sha>`.

Open the PR on GitHub, then **Checks** → select the workflow run → **Artifacts** (retention is limited; see the workflow `retention-days`).

## Releases

The **Release** workflow (`.github/workflows/release.yml`) handles two flows: automatic **pre-releases** on push to `main` and manual **final releases** on tag push.

### Pre-releases (automatic)

Pushing to `main` (typically a PR merge) triggers a release build unless the push only changes docs/license/markdown (same `paths-ignore` as the PR workflow). The workflow:

1. Reads the PR description and merge commit message for a `+semver:` annotation (see rules below).
2. Applies the version bump to `package.json`, commits it with `[skip ci]`, and creates a pre-release tag `v<version>-pr.<N>`.
3. Builds **portable zips** and **Electron installers** and attaches them to a GitHub **Pre-release**.

### `+semver:` annotation rules

Include one of these in the **PR description** or **merge commit message** to control the next version. The first matched annotation wins (major > minor > patch).

| Annotation | Semver bump | Example (`0.1.0` →) |
|---|---|---|
| `+semver:major` or `+semver:breaking` | Major | `1.0.0` |
| `+semver:minor` or `+semver:feature` | Minor | `0.2.0` |
| `+semver:patch` or `+semver:fix` | Patch | `0.1.1` |
| *(absent)* | Patch (default) | `0.1.1` |

### Final releases (manual)

When you're ready to ship the accumulated pre-release changes:

1. Push a semver tag matching the desired version:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
2. The workflow cleans up any pre-releases matching `v<version>-pr.*`, builds artifacts, and creates a **GitHub Release** with auto-generated release notes.

### Artifacts

Each run of the Release workflow builds the same **portable zips** (one per OS) and **Electron installers** (DMG, NSIS exe, deb, AppImage) as the PR workflow. The `publish` job attaches them to the GitHub Release or Pre-release. Intermediate artifact names use the resolved version tag (e.g. `poster-portable-release-ubuntu-latest-v0.2.0-pr.3-<sha>`).

## License

Poster is licensed under the [PolyForm Strict License 1.0.0](https://polyformproject.org/licenses/strict/1.0.0). See [`LICENSE`](./LICENSE) for the Required Notice and full terms.

## Learn more

This repo includes both [Create React App](https://github.com/facebook/create-react-app) and [Remix](https://remix.run/) tooling. See their documentation for advanced configuration.
