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
| `pnpm run eject` | CRA eject (irreversible); rarely needed |

## Learn more

This repo includes both [Create React App](https://github.com/facebook/create-react-app) and [Remix](https://remix.run/) tooling. See their documentation for advanced configuration.
