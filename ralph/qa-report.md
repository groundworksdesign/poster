# Feedback

## fix-json-restore-preserve-songs DEV (fix loop 10) — awaiting QA

`<status>pending</status>`

### Changes

- JSON: `replaceLibraryFromJsonText` keeps on-disk songs when backup omits `songs` key; present key (incl. `[]`) replaces.
- SQLite: `replaceDb` snapshots live songs; if restored DB has zero songs, re-inserts preserved rows.
- Tests: pre-epic backup keeps songs + restores decks; backup with songs replaces (JSON + SQLite).

### Checks (DEV)

| Check | Result |
| --- | --- |
| `tsc --noEmit` | exit 0 |
| `library-json.server` + `db-restore-songs` | 11/11 PASS |

### Next

QA on `fix-json-restore-preserve-songs` (do not set passes until QA).
