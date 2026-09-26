# Feedback

## epic-003 QA PASS

- IPC bridge: `poster:enter/exit/toggle/is-fullscreen` on sender BrowserWindow; preload APIs exposed.
- Present Electron path: F → `toggleFullscreen`; Escape → `exitFullscreen`; never `requestFullscreen` when bridge present.
- Fallback: native failure and darwin menu-bar heuristic → `setSimpleFullScreen`; exit clears both modes.
- No auto-FS on `openPresentSessionWindow`; no display picker; no kiosk.
- Browser path unchanged: HTML `requestFullscreen`.
- Tests: tsc exit 0; Jest 45 suites / 300 tests PASS.
- Release notes: `docs/release-notes-epic-003-mac-present-fullscreen.md`.

Do not merge — Jack is merge gate. Beta PR exception allows early draft PR for PR Build installers.
