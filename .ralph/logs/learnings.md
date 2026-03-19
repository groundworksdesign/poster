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
