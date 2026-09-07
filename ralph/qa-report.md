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

Related finding for the packaged path (recorded, not changed):
**Home "Change..." is unusable in Electron.** `src/HomePage.tsx:58` calls
`window.prompt`, which Electron renders do not support (`Error: prompt() is not
supported.`), so the button throws before re-pointing. The re-point logic itself
was validated through the same `/library/settings` route the button calls
(see Item E below), and the old folder is left untouched. Recommended follow-up:
prompt shim / inline input when `window.poster` is present.

## New smoke specs (electron-* — run under `playwright.electron.config.ts`, no dev server)

| Spec | Covers | Assertions |
| --- | --- | --- |
| `e2e/electron-end-blank.spec.ts` | Item A End blank | Open Present → Start shows slide 1; End clears title/body text on Present, deck controls show Blank; Start after End resumes at slide 1 |
| `e2e/electron-present-close.spec.ts` | Item C close list cleanup | Present is listed in deck `present-list`; closing the BrowserWindow removes it (no stale UUID) |
| `e2e/electron-library.spec.ts` | Item E default `~/.poster`, relaunch, re-point leave-old | Home shows default `HOME/.poster`; save → `poster.sqlite` under it; quit + relaunch lists the deck again; re-point via change route → new root active, old root keeps data (re-point back still lists old deck), sentinel untouched, no JSON fallback created |
| `e2e/electron-home-guard.spec.ts` | Home no bare "Open Present" | No `Open Present` CTA; home hrefs are only `/deck`, `/deck`, `/deck?focusImport=1`; bare `/presentation` shows operator guidance; `window.open('/presentation')` is denied and opens a deck window |
| `e2e/electron-theme-relaunch.spec.ts` (existing) | Item B theme relaunch | Set Tokyo Night → quit → relaunch → Home/deck/Present restore `dracula` from `~/.poster/theme.json` |

Shared launch helper: `e2e/electronHelpers.ts` (isolated `HOME` / `--user-data-dir`,
pins process env, never touches a real profile).

## Tests executed (packaged/Electron smoke)

`pnpm exec playwright test --config=playwright.electron.config.ts`
→ **8 passed** (10.4s): end-blank, home-guard x3, library-default-relaunch,
library-repoint-leave-old, present-close, theme-relaunch.

## Regression re-run (source untouched except new e2e specs)

| Command | Result |
| --- | --- |
| `CI=true pnpm exec react-scripts test --watchAll=false --runInBand` | 38 suites, **226 passed** |
| `CI=true pnpm run test:e2e:remix` | **52 passed** |

## Per-flow verdict (packaged/Electron level)

| Flow | Electron evidence | Verdict |
| --- | --- | --- |
| A End blank | `electron-end-blank.spec.ts` | **PASS** |
| B Theme relaunch | `electron-theme-relaunch.spec.ts` | **PASS** |
| C Closing Present cleans deck list | `electron-present-close.spec.ts` | **PASS** |
| E Library default `~/.poster` + re-point leave-old | `electron-library.spec.ts` (x2) | **PASS** (re-point UI button itself blocked by Electron `window.prompt` — see finding) |
| Guard Home no bare Open Present | `electron-home-guard.spec.ts` (x3) | **PASS** |

## Findings / notes

1. **Packaged SSR 500 beforehand** — stale local `build/` (jsx-dev runtime) broke the
   Electron server under `NODE_ENV=production`; regenerated with `pnpm run build:remix`.
   CI is unaffected (always builds fresh).
2. **Electron Home "Change..." broken by `window.prompt`** — packaged-only UI defect,
   not covered by the Remix browser E2E. Re-point validated via the same
   `/library/settings` route; UI path needs a follow-up (prompt shim for Electron).
3. Root `playwright.config.ts` now ignores `electron-*.spec.ts` (they run only under
   the Electron config), so `pnpm run test:e2e` does not launch stray app processes.

--- historical ---

# QA Report: epic-004 completion check (historical, 2026-09-02)

Prior report confirming epic-004 completion (directed-send, single-home, theme
persist, program thumbnail). Superseded by the epic-005 evidence above.