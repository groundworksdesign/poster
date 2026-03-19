# Ralph Learnings

This document accumulates durable learnings across loop iterations.




## Copilot iteration — session plan & verification (2026-03-19)

## Song flow design (2026-03-19)

Decided to represent loaded songs as a single SlideType.SONG containing full SongData (title/author/verses), and to send navigation-only updates via PresentData.data.lyricsNavigation. This keeps song parsing and serialization separate from rendering (LyricsDisplay renders 2-lines-per-segment and Presentation manages the current segment index). It simplifies editing and testing: deck JSON round-trips keep the full SongData payload.

## Remix scaffold note (2026-03-19)
Created /app scaffold for Remix route porting; full Remix install & run blocked by environment (no network). Files ported: PresentTypes, Broadcast (browser-friendly), songParser, LyricsDisplay, SlideDisplay, Deck route, Presentation route.

## Green-screen rendering (2026-03-19)
When using green-screen mode (useGreenScreen=true) the presentation should render the body background as the chroma key color while making slide content backgrounds transparent. Implemented: Presentation overrides slide background to transparent when green-screening, and honors backgroundImage, backgroundSize, backgroundPosition and horizontal/vertical alignment fields to allow slide content to be positioned and composited correctly.

## BroadcastChannel testing (2026-03-19)

When testing cross-window messaging, use a FakeBroadcastChannel in tests by assigning it to global.BroadcastChannel. The fake should register instances per channel name and route postMessage calls to other instances' onmessage handlers. This enables integration tests that simulate builder -> presenter communication without real browser windows.

## Test environment crypto fallback (2026-03-19)

jsdom (test env) may not provide global.crypto.randomUUID. To keep Presentation/Broadcast working in tests, use a safe fallback for id generation in connect (e.g., use crypto.randomUUID when available, otherwise use a timestamp+random fallback).

## Lyrics reset test (2026-03-19)

Added a unit test confirming Presentation resets lyrics segmentIndex to 0 when a new SongData arrives. Tests use a FakeBroadcastChannel to route messages between instances; ensure test code cleans up channel instances (or delete global.BroadcastChannel) to avoid Jest open-handle warnings.

## Deck reorder sync (2026-03-19)

Ensure slides have stable ids so the builder can re-send the exact slide after edits or reordering. Implemented genId fallback for environments without crypto.randomUUID. Added move up/down controls and automatic resync of last-sent slide via BroadcastChannel (used FakeBroadcastChannel in tests).
## Rendering improvements
Applied alignment/backgroundImage handling for SONG, IMAGE and GENERAL slides in src/Present/Present.tsx.
### Test runner warnings (2026-03-19)

- ReactDOMTestUtils.act is deprecated; update tests to import `act` from 'react' instead of 'react-dom/test-utils' to silence warnings.
- babel-preset-react-app warns about an undeclared dependency (`@babel/plugin-proposal-private-property-in-object`). Consider adding it to devDependencies or migrating off CRA for long-term maintenance.

### Test suite additions (2026-03-19)

- Added edge-case tests for song parsing and lyrics rendering. Small improvements to test coverage achieved without new dependencies.
- Tests printed warnings about ReactDOMTestUtils.act deprecation; update tests to import `act` from 'react' instead of 'react-dom/test-utils' to silence warnings.
- If tests report leaked handles, run with `--detectOpenHandles` to identify lingering timers or unclosed BroadcastChannel mocks.


### Integration testing: prefer channel-driven messages over FileReader
FileReader + file uploads in jsdom can be flaky; prefer simulating BroadcastChannel messages directly to exercise the builder->cast pipeline in integration tests.

### Playwright smoke test added (2026-03-19)
Using a single Playwright context so BroadcastChannel messages route between pages.

### Playwright smoke: run notes (2026-03-19)
Installed missing deps to run Playwright smoke test. Test passed locally: 1 test. Noted babel-preset-react-app warning about missing plugin dependency.

## Coverage configuration (2026-03-19)

Configured coverage scripts using CRA/Jest: `npm run test:coverage` (single-run coverage) and added coverage thresholds in package.json. If migrating to Vitest later, migrate thresholds and coverage config to Vitest's coverage provider (c8/istanbul).
## Session note — 2026-03-19
Created session plan.md; running coverage shows 53.13% overall. Observed ReactDOMTestUtils.act deprecation warnings; update tests to import `act` from 'react' to silence.
\n## Remix migration blocker (2026-03-19)\n\nRemix/Vite scaffold present but cannot complete install/build due to network restrictions in this environment. To finish migration: add required dependencies and run npm install; in CI, enable dependency caching or vendor dependencies.\n
### Spec review (2026-03-19)

Confirmed presence and coverage of .ralph/specs/app_spec.md and nested spec docs (features, data_model, architecture). Migration to Remix/Vite remains blocked by network install; next actions: vendor dependencies or prebuild server artifact for offline CI.

### Test run confirmation (2026-03-19)

After reviewing specs and updating session plan, ran the full test suite. All test suites passed locally (8 suites, 14 tests). No code changes were required.

### Remix migration blocker (2026-03-19T20:13:21Z)

Discovered server/index.js depends on @remix-run/node (createRequestHandler) which is not present in node_modules; remix and @remix-run/* packages must be added or vendorized. Updated .ralph/fix_plan_poster.md to capture options (vendor artifacts or allow network installs).
## Remix runtime staging (2026-03-19)
Moved @remix-run/node to dependencies to reflect runtime requirement for server/index.js. The environment remains offline, so full Remix build still requires vendorized modules or network installs.

### Remix migration fallback (2026-03-19T20:32:55.093Z)
When Remix runtime packages are unavailable, server/index.js falls back to serving public/index.html; added start:spa script to use this mode. To complete migration, vendorize runtime packages or enable network install in CI.
### Vendor stub for Remix runtime
Added vendor/@remix-run/node minimal stub to allow offline start:remix fallback and updated server/index.js to prefer vendorized runtime when present. Full Remix build (/build) still required for production behavior.

## 2026-03-19 - Migration note
Remix runtime requires vendorization or network install in CI. Prefer committing /build or vendor dependencies for offline environments.

### Offline Remix build stub

Created minimal /build/index.js to allow server/index.js to require('../build') in offline environments. Replace with a real Remix build when network/install available.

### Vendorized Remix runtime (2026-03-19)

When network installs are unavailable, add a minimal vendor/@remix-run/node stub exporting createRequestHandler that serves public/index.html. Also include a /build/index.js offline stub. This enables server/index.js to start in offline/dev mode and allows running smoke tests. Replace these stubs with the real Remix build when network/install becomes available.

### React act deprecation — 2026-03-19
Imported act from 'react' in tests that explicitly used it to follow React recommendation. Warnings persist for render calls due to @testing-library/react internals using react-dom/test-utils. Options: upgrade @testing-library/react or adjust tests.

### Fix act deprecation (2026-03-19)

Updated tests to import { act } from 'react' where applicable. ReactDOMTestUtils.act deprecation warnings persist because @testing-library/react internals still use react-dom/test-utils. To fully silence warnings, upgrade @testing-library/react when network access is available.


### Tests: small units raise coverage (2026-03-19)

Adding tight unit tests for DeckBuilder and SlideDisplay increased coverage from ~53% to ~55% and exercised save/no-deck and send-action code paths. Keep adding small focused tests targeting untested files (DeckBuilder internal branches, index.tsx if safe) to reach threshold. Note: some tests may leak handles due to global fakes — ensure cleanup in afterEach.


## Test run — 2026-03-19T21:30:20Z
Ran test:coverage: 10 suites passed, 16 tests, All files 55.44%.
Observed ReactDOMTestUtils.act deprecation warnings from testing-library internals; plan to upgrade @testing-library/react when network available.
## 2026-03-19 — Spec review & runtime status

Verified .ralph/specs covers deck/presentation, broadcast pipeline, lyrics model, and tests. The server includes a vendor stub for @remix-run/node to allow offline start, but a real Remix build under /build is still required for full server behavior. The ReactDOMTestUtils.act deprecation persists due to @testing-library/react internals; upgrade @testing-library/react when network access is available.

