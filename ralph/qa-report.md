# Feedback

## fix-song-library-apply-flake DEV (fix loop 14) — awaiting QA

`<status>pending</status>`

### Changes

- `saveEdit`: `setBusy(false)` before `fetchSongs` after `setDeckPrompt` so Apply is not disabled during list refresh.
- Unit test waits for Apply `toBeEnabled()` before click.

### Checks (DEV)

| Check | Result |
| --- | --- |
| REQ-012/023 apply-decks isolation ×10 | **10/10 PASS** |

### Next

QA on `fix-song-library-apply-flake` (10× isolation; do not set passes until QA).
