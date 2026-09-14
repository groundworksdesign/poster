# QA report — verify-unit-integration-green (REQ-004 partial)

**Result:** PASS  
**Branch tip:** `2b563c2` (+ this QA commit)  
**Verified at:** 2026-09-14T15:52:35.000Z

## Acceptance checks

| Criterion | Evidence | Result |
| --- | --- | --- |
| tsc --noEmit | Independently ran pnpm exec tsc --noEmit -> exit 0 | PASS |
| Jest unit/integration | Independently ran CI=true pnpm exec react-scripts test --watchAll=false --runInBand -> 41 suites / 254 tests passed; no FAIL lines | PASS |
| Matches CI unit-integration | .github/workflows/pr.yml uses the same two commands | PASS |

## Residual

- REQ-004 e2e half remains: verify-remix-electron-e2e-green.
- Console warnings (jsdom navigation / ReactDOMTestUtils.act deprecation) present but non-failing.

---

# QA report — harden-config-ci-script-paths (REQ-003)

**Result:** PASS  
**Branch tip:** `668a5ed` (+ this QA commit)  
**Verified at:** 2026-09-14T15:47:15.000Z

## Acceptance checks

| Criterion | Evidence | Result |
| --- | --- | --- |
| remix appDirectory = src/adapters/remix | remix.config.js | PASS |
| package.json main/start on adapters | main=src/adapters/electron/main.cjs; start/start:remix use persistence server | PASS |
| electron-builder + portable pack adapter paths | files include adapters; package-portable.mjs copies + documents adapter server; no server/index.js | PASS |
| Operator README/requirements paths | No stale electron/main.cjs or server/index.js; tests/e2e Playwright paths | PASS |
| Durable guard green | CI=true pnpm exec react-scripts test --watchAll=false --testPathPattern=config-path-alignment -> 5/5 | PASS |

## Residual

- Historical docs/epics may still mention old paths (out of scope for this task).
- Next backlog: verify-unit-integration-green.

---

# QA report — audit-layer-import-rule (REQ-002)

**Result:** PASS  
**Branch tip:** `3203a23` (+ this QA commit)  
**Verified at:** 2026-09-14T15:33:30.000Z

## Acceptance checks

| Criterion | Evidence | Result |
| --- | --- | --- |
| No Remix/Electron/Playwright imports under domain/application | Independent scan of 20 source files under `src/domain` + `src/application` (comments stripped): 0 forbidden import/require hits | PASS |
| No relative escapes to adapters/presentation/e2e | Same scan: 0 relative leaks | PASS |
| Durable automated guard | `src/__tests__/layer-import-rule.test.js` walks both layers (prod + colocated tests), parses import/require/export-from, fails on forbidden specs | PASS |
| Guard green under Jest | `CI=true pnpm exec react-scripts test --watchAll=false --testPathPattern=layer-import-rule` → 1 suite / 3 tests passed | PASS |
| CI pickup | Path under `src/__tests__/`; `unit-integration` runs full `react-scripts test --watchAll=false --runInBand` | PASS |

## Commands run

```bash
# Independent import audit (Python walk + comment-stripped import/require scan)
# -> 20 files, 0 hits
CI=true pnpm exec react-scripts test --watchAll=false --testPathPattern=layer-import-rule
# -> 3 passed
```

## Residual

- None for REQ-002. Next backlog: `harden-config-ci-script-paths`.

---

# QA report — verify-on-program-after-present-hydrate (task 8)

**Result:** PASS  
**Branch tip:** `b6660fd` (+ this QA commit)  
**Verified at:** 2026-09-14T15:25:24.000Z

## Acceptance checks

| Criterion | Evidence | Result |
| --- | --- | --- |
| After present-ready, Start updates On Program | `electron-program-thumbnail.spec.ts` waits `present-ready`, Start, asserts Present text + `program-thumbnail-title`/`subtitle` | PASS |
| End clears thumbnail | Same spec: End → Present text gone + `program-thumbnail-empty` | PASS |
| Automated coverage | Electron e2e + `programThumbnail` unit/integration (14 tests) | PASS |
| Cold hydrate gate | `openPresentWindow` requires `present-ready` / zero `present-loading` before Send path | PASS |
| Home/library/theme | No product changes in this task (test-only) | PASS |

## Commands run

```bash
pnpm run build:remix
CI=true ELECTRON_DISABLE_SANDBOX=1 xvfb-run -a pnpm exec playwright test \
  --config=tests/e2e/playwright.electron.config.ts electron-program-thumbnail.spec.ts
# -> 1 passed
CI=true pnpm exec react-scripts test --watchAll=false --runInBand \
  --testPathPattern='programThumbnail|ProgramThumbnail'
# -> 2 suites / 14 tests passed
```

## Residual

- Packaged AppImage installer cold path not re-run in this QA env; track under `document-appimage-residual-risk` / Jack retest.

---

# QA report — fix-present-first-open-hydrate (task 7)

**Result:** PASS  
**Branch:** `cursor/clean-architecture-restructure-018c` @ `2278b6c`  
**Verified at:** 2026-09-14T15:18:30.000Z

## Acceptance checks

| Criterion | Evidence | Result |
| --- | --- | --- |
| Main-owned present-session | `main.cjs` `openPresentSessionWindow` + `loadURL` + `{ action: 'deny' }`; regression test "owns present-session windows via loadURL" | PASS |
| PR #18 path intact | `openPresentWindow.ts` electron-direct: spawn then absolute `window.open`, never about:blank; browser keeps about:blank gesture; unit tests in openPresentWindow + DeckBuilder | PASS |
| Hydrate-gated e2e helper | `electronHelpers.openPresentWindow` waits `present-ready` and zero `present-loading` | PASS |
| Home/deck policy not regressed | Home deny + ensureHomeWindow; deck/present-blank still allow; present-bare → openDeckWindow | PASS |
| Focused tests | 4 suites / 51 tests PASS; `tsc --noEmit` clean | PASS |

## Commands run

```bash
CI=true pnpm exec react-scripts test --watchAll=false --runInBand \
  --testPathPattern='electron-main.regression|openPresentWindow|homeWindowPolicy|DeckBuilder.unit'
pnpm exec tsc --noEmit
```

## Gaps / residual

- Live packaged AppImage cold first-open was **not** re-run in this QA environment. Engineering criteria for this task pass; Jack AppImage retest remains for final packaged sign-off (track under `document-appimage-residual-risk` / REQ-005).

---

# QA report — fix-e2e-repo-root-paths (task 1)

**Result:** PASS  
**Branch:** `cursor/clean-architecture-restructure-018c`  
**Verified at tip:** see commit after this report  

## Acceptance checks

| Criterion | Evidence | Result |
| --- | --- | --- |
| Repo root from helpers is real repo (package.json + Electron main), not `tests/` | `node tests/e2e/repoRoot.selfcheck.cjs` → `/workspace`; one-level-up resolves to `/workspace/tests` and is rejected | PASS |
| Sample deck path resolves under repo `public/` | `public/sample-slide-deck.json` exists; `home-library.spec.ts` / `library.spec.ts` use `path.join(REPO_ROOT, 'public', 'sample-slide-deck.json')` | PASS |
| Electron helpers/theme relaunch launch with repo root | `electronHelpers.ts` / `electron-theme-relaunch.spec.ts` call `assertRepoRoot(REPO_ROOT)` and pass `root` as Electron app path arg | PASS |
| Playwright webServer cwd is repo root | `playwright.config.ts`, `playwright.local.config.ts`, `playwright.config.js`, `playwright.remix.config.ts` set `cwd: repoRoot` with `path.resolve(__dirname, '..', '..')` | PASS |
| No remaining one-level repo-root assumption | Grep: no `process.cwd()`; bare `__dirname,'..'` only in selfcheck as intentional wrong-path guard | PASS |
| Remix library spawn paths | `remix-library-relaunch.spec.ts` / `remix-library-repoint.spec.ts` spawn `src/adapters/persistence/server.js` with `cwd: REPO_ROOT` | PASS |

## Commands run

```bash
node tests/e2e/repoRoot.selfcheck.cjs
node -e 'assert assets under REPO_ROOT'
rg process.cwd / path.resolve(__dirname) under tests/e2e
```

## Notes

- Full Playwright Electron/Remix suite not re-run in this QA loop; path-resolution acceptance for this task is satisfied by filesystem + static evidence + selfcheck.
- `passes: true` set only for `fix-e2e-repo-root-paths` / task 1.
