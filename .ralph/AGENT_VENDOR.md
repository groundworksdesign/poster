# Vendorization & Offline Remix build

This document describes how to produce vendor/ and /build artifacts for offline CI or environments without network access. Add these artifacts to the repository or an artifact store so `npm run start:remix` can run without fetching runtime packages.

Product direction and migration tasks live in **`.cursor/plans/remix_vite_+_deck_ux_7fba078c.plan.md`**; Ralph tracks implementation in **`.ralph/fix_plan_poster.md`** (marked open-task section).

### Goals

- Produce a real Remix `/build` directory (the output of `remix build`).
- Vendorize the minimal runtime packages required by `server/index.js` (e.g., `@remix-run/node`), placed under `vendor/` so the server can require them.
- Document commands to reproduce the artifacts on an online machine.

### Example steps (on an online machine)

1. Clone the repo and install dependencies:

   git clone <repo> poster-offline
   cd poster-offline
   npm ci

2. Produce the Remix build:

   npm run build:remix

   This creates `/build` (the real Remix production build). Verify `./build/index.js` exists.

3. Vendorize runtime packages required at runtime (example for @remix-run/node):

   mkdir -p vendor/@remix-run
   cp -R node_modules/@remix-run/node vendor/@remix-run/node

   Repeat for any additional runtime packages referenced by `server/index.js` (or other server code).

4. Verify the server can start offline using the vendorized runtime and the produced `/build`:

   NODE_ENV=production node ./server/index.js

5. Commit the produced artifacts if desired (note: committing build/artifacts increases repo size):

   git add build vendor
   git commit -m "chore: add vendorized runtime and build artifacts for offline/CI use\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

### CI / caching recommendations

- Cache `vendor/` and `/build` between CI runs (or restore them from an artifact store) to avoid network installs during CI.
- If repository policy forbids committing `/build`, publish `/build` and `vendor/` to a dedicated artifact store and restore them in CI before `npm run start:remix`.

### Notes

- The `server/index.js` script already prefers `vendor/@remix-run/node` if present. Keep vendorized paths consistent with server expectations.
- When network is available, prefer running `npm install` and a real `remix build` to keep artifacts up-to-date.
