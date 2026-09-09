# QA Report: epic-005 packaged / Electron acceptance evidence

**Epic:** epic-005 next-cycle fixes (tasks 1–6 ship Items A–E + Home guard)
**Branch:** `ralph/epic-005-next-cycle` (poster repo, `/Users/hpractv/ralph-runs/poster`)
**Task 9:** Validate packaged acceptance flows
**Verified at:** 2026-09-07 (local run, macOS darwin)
**Persona:** qa (independent)

## Scope

Add and run **packaged / Electron smoke** for the five epic-005 flows at the full
`electron/main.cjs` runtime (real `BrowserWindow`s, embedded Express/Remix server,
IPC session graph, `~/.poster` durable home). No directed-send code was rebuilt.

## Prerequisite fix (needed to make Electron feasibility real)

The leftover local Remix build at `build/` had been produced by `remix dev` and
referenced `react/jsx-dev-runtime.jsxDEV`. Because `electron/main.cjs` starts the
embedded server with `NODE_ENV=production`, every route 500'd with
`TypeError: (0 , import_jsx_dev_runtime.jsxDEV) is not a function` — the packaged
app could not render at all on this machine. Regenerating with
`pnpm run build:remix` (which builds with `NODE_ENV=production` and emits the
non-dev `jsx` runtime) makes the Electron server render correctly. All Electron
smoke below runs against that production-mode server.

Related finding for the packaged path (**resolved**): **Home "Change..." was unusable in
Electron.** `src/HomePage.tsx` called `window.prompt`, which Electron renderers do not
support (`Error: prompt() is not supported.`), so the button threw before re-pointing.
**Fix landed:** the Home Change... control now uses a native folder-picker bridge
(`window.poster.pickLibraryFolder` → IPC `poster:pick-library-folder` →
`dialog.showOpenDialog` with openDirectory/createDirectory) when `window.poster` is
present, with the browser `window.prompt` fallback otherwise. The re-point flow (and
its leave-old-folder guarantee) is exercised end-to-end via the same `/library/settings`
route the button calls, and the button's picker/prompt selection is guarded at the
component and main-process test level. See the Change... coverage note below and
`src/HomePage.unit.test.tsx` / `src/__tests__/electron-main.regression.test.js`.

## New smoke specs (electron-* — run under `playwright.electron.config.ts`, no dev server)

| Spec | Covers | Assertions |
| --- | --- | --- |
| `e2e/electron-end-blank.spec.ts` | Item A End blank | Open Present → Start shows slide 1; End clears title/body text on Present, deck controls show Blank; Start after End resumes at slide 1 |
| `e2e/electron-present-close.spec.ts` | Item C close list cleanup | Present is listed in deck `present-list`; closing the BrowserWindow removes it (no stale UUID) |
| `e2e/electron-library.spec.ts` | Item E default `~/.poster`, relaunch, re-point leave-old | Home shows default `HOME/.poster`; save → library store (`poster.sqlite` or JSON fallback) under it; quit + relaunch lists the deck again; re-point via Change... → new root active, old root keeps data (re-point back still lists old deck), sentinel untouched |
| `e2e/electron-home-guard.spec.ts` | Home no bare "Open Present" | No `Open Present` CTA; home hrefs are only `/deck`, `/deck`, `/deck?focusImport=1`; bare `/presentation` shows operator guidance; `window.open('/presentation')` is denied and opens a deck window |
| `e2e/electron-theme-relaunch.spec.ts` (existing) | Item B theme relaunch | Set Tokyo Night → quit → relaunch → Home/deck/Present restore `dracula` from `~/.poster/theme.json` |

The Home **Change...** control itself is covered at the component and main-process level:
`src/HomePage.unit.test.tsx` asserts the button prefers the native picker
(`window.poster.pickLibraryFolder`) and falls back to `window.prompt` in a plain
browser; `src/__tests__/electron-main.regression.test.js` asserts
`poster:pick-library-folder` (`dialog.showOpenDialog`) exists and is exposed on the
preload bridge. An Electron smoke that clicks the real Change... button remains an
unblocked follow-up (task 11); re-point *behavior* is already exercised end-to-end by
`e2e/electron-library.spec.ts` via the same `/library/settings` route.

Shared launch helper: `e2e/electronHelpers.ts` (isolated `HOME` / `--user-data-dir`,
pins process env, never touches a real profile).

## Tests executed (packaged/Electron smoke)

`pnpm exec playwright test --config=playwright.electron.config.ts`
→ **8 passed** (10.5s): end-blank, home-guard x3, library-default-relaunch,
library-repoint-leave-old, present-close, theme-relaunch.

## Regression re-run (after the Change... fix; product behavior otherwise untouched)

| Command | Result |
| --- | --- |
| `CI=true pnpm exec react-scripts test --watchAll=false --runInBand` | 38 suites, **229 passed** (+3 for the Change... fix guard) |
| `CI=true pnpm run test:e2e:remix` | **52 passed** |

## Per-flow verdict (packaged/Electron level)

| Flow | Electron evidence | Verdict |
| --- | --- | --- |
| A End blank | `electron-end-blank.spec.ts` | **PASS** |
| B Theme relaunch | `electron-theme-relaunch.spec.ts` | **PASS** |
| C Closing Present cleans deck list | `electron-present-close.spec.ts` | **PASS** |
| E Library default `~/.poster` + re-point leave-old | `electron-library.spec.ts` (x2) + Change... component/main guard | **PASS** (button fixed: native folder-picker bridge replaces unsupported `window.prompt`; see closed finding 2) |
| Guard Home no bare Open Present | `electron-home-guard.spec.ts` (x3) | **PASS** |

## Item D Mac fidelity — **Roy-waived 2026-09-09**

Mac pixel-fidelity recording for Item D (on-program thumbnail) is **Roy-waived
2026-09-09** for this PR (`ralph/epic-005-next-cycle` / PR #17). Linux CI continues
to assert content markers / placement via unit + `e2e/remix-program-thumbnail.spec.ts`.
Do not treat missing Mac capture evidence as a merge blocker for this cycle.

## Findings / notes

1. **Packaged SSR 500 beforehand** — stale local `build/` (jsx-dev runtime) broke the
   Electron server under `NODE_ENV=production`; regenerated with `pnpm run build:remix`.
   CI is unaffected (always builds fresh).
2. ~~**Electron Home "Change..." broken by `window.prompt`**~~ — **CLOSED.** The button
   now prefers the native folder picker (`poster:pick-library-folder` IPC →
   `dialog.showOpenDialog`, bridge exposed via `electron/preload.cjs` through
   `window.poster.pickLibraryFolder`); `window.prompt` remains only as the browser
   fallback. Guarded by `src/HomePage.unit.test.tsx` and the
   `poster:pick-library-folder` regression assertion in
   `src/__tests__/electron-main.regression.test.js`. No canonical doc claims the
   re-point control is broken; re-point leave-old remains **PASS** end-to-end.
3. Root `playwright.config.ts` now ignores `electron-*.spec.ts` (they run only under
   the Electron config), so `pnpm run test:e2e` does not launch stray app processes.

--- historical ---

# QA Report: epic-004 completion check (historical, 2026-09-02)

Prior report confirming epic-004 completion (directed-send, single-home, theme
persist, program thumbnail). Superseded by the epic-005 evidence above.