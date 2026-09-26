---
name: Reliable Mac Present fullscreen
epic: epic-003
status: approved
overview: "On Mac Electron, Present F uses native fullscreen with a stronger simpleFullscreen-style fallback that still exits easily via F or Escape; no auto-FS on open; browser Present unchanged."
todos:
  - id: ipc-fullscreen-bridge
    content: "Add Electron IPC + preload APIs so Present can request enter/exit fullscreen on its own BrowserWindow (macOS native setFullScreen; no HTML-only path on Electron)."
    status: pending
  - id: present-f-uses-native
    content: "On Electron Present, F enters/exits via the bridge (native setFullScreen). Do not call requestFullscreen on Electron. Browser Present keeps HTML requestFullscreen."
    status: pending
  - id: stronger-fallback
    content: "If after native fullscreen the Mac menu bar still remains visible (or native FS fails), fall back to setSimpleFullScreen (or equivalent) while preserving easy exit."
    status: pending
  - id: easy-exit
    content: "F and Escape always leave fullscreen (native or fallback) and restore the windowed Present; no hard kiosk lock."
    status: pending
  - id: no-auto-on-open
    content: "Opening a Present window stays windowed; fullscreen only after operator F (or explicit UI that maps to the same path)."
    status: pending
  - id: window-scoped-only
    content: "Fullscreen applies only to existing Present BrowserWindows on the display they already occupy; no display-picker UI."
    status: pending
  - id: automated-checks
    content: "Add automated coverage for Electron bridge behavior (enter/exit native vs fallback routing, browser still uses HTML FS) at unit/IPC mock level Jack can extend."
    status: pending
  - id: release-notes-docs
    content: "Release-notes bullet for Mac Present fullscreen reliability; short note that System Settings menu-bar mode can still affect Never, with the app fallback covering stubborn cases."
    status: pending
isProject: false
---

# Epic 003: Reliable Mac Present fullscreen

## Goal

Mac Electron Present fullscreen reliably hides the system menu bar for program output. Present stays windowed on open; `F` (and Escape to leave) drive native Electron fullscreen, with a stronger Mac fallback when native alone is not enough, without trapping the operator. Browser Present keeps today’s HTML fullscreen.

## Requirements

- **REQ-001** On Mac Electron, Present `F` enters/exits fullscreen via main-process native `BrowserWindow.setFullScreen`, not HTML `requestFullscreen`.
- **REQ-002** If the system menu bar still shows after native fullscreen (or native FS cannot be used), apply a stronger Mac fallback (`setSimpleFullScreen` or equivalent) that still exits with `F` / Escape.
- **REQ-003** `F` and Escape always restore windowed Present; no hard kiosk that blocks easy exit.
- **REQ-004** Present does not enter fullscreen automatically when the window opens.
- **REQ-005** Only existing Present windows are fullscreened, on the display they already occupy (no display-picker UI).
- **REQ-006** Browser / Remix Present continues to use HTML `requestFullscreen` / `exitFullscreen` only.
- **REQ-007** Shipping release notes mention the Mac Present fullscreen reliability fix in user-facing language.

## Current baseline

- Present toggle: `document.documentElement.requestFullscreen()` / `exitFullscreen()` on `F` in `src/presentation/Present/Present.tsx`.
- Electron Present window: plain `BrowserWindow` in `openPresentSessionWindow()` (`src/adapters/electron/main.cjs`) — no `setFullScreen`, `setSimpleFullScreen`, or kiosk.
- Preload has no fullscreen IPC (`src/adapters/electron/preload.cjs`).
- macOS menu-bar visibility in fullscreen follows System Settings (Never / On Desktop Only can keep the bar visible); HTML FS does not put the window in a native macOS Space.

## Out of scope

- Auto-fullscreen when Present opens.
- Display-picker / “which screen” UI.
- Changing browser Present fullscreen behavior.
- Hard kiosk lock with no easy exit.
- Windows / Linux menu-bar APIs as the Mac fix (`autoHideMenuBar` / `setMenuBarVisibility` do not control the macOS system menu bar).

## Implementation plan

1. Add main IPC handlers to enter/exit fullscreen on the sender’s `BrowserWindow` (prefer `setFullScreen`; on macOS, stronger fallback via `setSimpleFullScreen` when needed). Expose a small `poster` preload API (e.g. enter/exit/isFullscreen) without elevating privileges.
2. In Present, detect Electron (`window.poster` / existing bridge) and route `F` / Escape through that API; leave HTML fullscreen for non-Electron.
3. Avoid stacking HTML `requestFullscreen` with native/simple modes on Electron (known Electron conflict with simpleFullscreen). Prefer one mode at a time.
4. Ensure Escape and `F` both exit whichever mode is active and restore a normal windowed Present.
5. Automated tests: mock IPC / bridge so Electron path never calls `requestFullscreen`; browser path still does; exit paths clear both native and fallback flags in the mock.
6. Release notes + brief operator note pointing at System Settings only as context; app fallback is the product answer for stubborn Never cases.

## Primary files (expected)

- `src/adapters/electron/main.cjs`
- `src/adapters/electron/preload.cjs`
- `src/presentation/Present/Present.tsx`
- New/extended unit or IPC tests under `src/` / `tests/` (align with Jack)

## Definition of Done

- [ ] Mac Electron: Present opens windowed; `F` enters native fullscreen (menu bar auto-hides when OS allows).
- [ ] Stubborn menu-bar cases: stronger fallback hides the menu bar; `F` and Escape still exit to windowed Present.
- [ ] Browser Present: `F` still uses HTML fullscreen only.
- [ ] No auto-fullscreen on Present open; no display picker.
- [ ] Automated bridge/path checks pass.
- [ ] PR / shipping release notes include a clear user-facing bullet.
- [ ] No implementation merge until this epic is `approved` and Roy says go.

## Validation

| Check | Layer | Fails if |
|-------|-------|----------|
| Electron `F` → native enter | Unit / IPC mock | Present still calls `requestFullscreen` when `window.poster` is present |
| Electron Escape / `F` → exit | Unit / IPC mock | Window left in fullscreen / simpleFullscreen after exit |
| Fallback path | Unit / IPC mock | Fallback never invoked when native path reports menu-bar still visible / failure; or exit does not clear fallback |
| Browser `F` | Unit | Browser path stops using HTML fullscreen |
| Open Present | Manual / smoke | Present starts already fullscreen |

## Risks to manage

- Mixing HTML fullscreen with `setSimpleFullScreen` can fight (Electron #50842); Electron path must not dual-enter.
- Simple fullscreen UX differs from Spaces (no separate Mission Control Space); easy exit is mandatory acceptance.
- OS “Never” may still reveal chrome on extreme edge cases; document briefly, rely on fallback first.
