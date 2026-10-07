# Feedback

## fix-remix-song-library-outlets QA (fix loop 3 / epic loop 23) — FAIL

`<status>failed</status>`

### What passed (fresh `build:remix` + `server.js`)

| Check | Result |
| --- | --- |
| `/library/songs` real UI (not coming soon) | PASS |
| `/library/songs/add` real UI | PASS |
| `/library/songs/import` real UI | PASS |
| `?_data` save / list `q=` / `usage=1` / import | PASS |
| Prod song-library e2e (Add/Import/Edit + chooser link) | PASS (2/2) |
| `Present/` vs `origin/main` | NO DIFF |
| `stagedSongSlide.ts` vs `origin/main` | NO DIFF |

### What failed

**Full Remix e2e suite is not green** (reproduced twice: 40 passed / 14 failed).

Failed specs (always after `remix-song-library`):

- `remix-theme-persist.spec.ts` (3)
- `remix-visual-regression.spec.ts` (11)

Root cause: `tests/e2e/remix-song-library.spec.ts` `beforeAll` runs `pnpm run build:remix` while Playwright's remix config `webServer` is still `remix dev`. The rebuild rewrites hashed files under `public/build/`; later tests get SSR HTML pointing at new hashes that remix-dev no longer serves:

`Error: No route matches URL "/build/entry.client-….js"` (and related chunks/CSS) → Present stuck on `Loading...`.

Isolated re-run of theme + visual (no mid-suite rebuild) → **14 passed**.

### Required fix (same task; DEV)

Stop rebuilding Remix assets mid-suite against the shared remix-dev webServer. Prefer:

- reuse an existing `build/` when present, or
- run the prod song-library suite as a separate Playwright project/config that does not share the remix-dev server, or
- build once in globalSetup before webServer starts

`passes:false`. Do not advance.
