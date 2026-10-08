# Feedback

## fix-client-process-reference DEV (fix loop 12) — awaiting QA

`<status>pending</status>`

### Changes

- Song-library route actions/loaders that imported `songs.server` / `linkedSongDecks.server` moved to `*.server.ts` (import, save, delete, decks, apply-decks).
- Client route modules only re-export; no persistence/`process` in song-library browser chunks.
- Prod e2e: no `pageerror` / console error on `/library/songs`, `/add`, `/import`, and chooser.

### Checks (DEV)

| Check | Result |
| --- | --- |
| `build:remix` | exit 0 |
| Client song routes import sqlite/library-root chunk | none |
| `test:e2e:remix:song-library` | 3/3 PASS |

### Next

QA on `fix-client-process-reference` (do not set passes until QA).
