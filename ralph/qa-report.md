# Feedback

## fix-remix-song-library-outlets DEV (fix loop 4 / epic loop 24)

Isolated prod song-library e2e from remix-dev. `passes:false`.

### Changes

- `playwright.remix.config.ts`: `testIgnore` remix-song-library
- `playwright.remix.song-library.config.ts` + `scripts/e2e-song-library-webserver.cjs` (build once + server.js)
- `package.json`: `test:e2e:remix` = dev then song-library; pr.yml uses combined script
- Spec no longer rebuilds mid-suite

### Validation

- `pnpm run test:e2e:remix` → remix-dev **52 passed**, song-library prod **2 passed**
