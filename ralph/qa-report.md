# Feedback

## linked-update-decks QA PASS

- AC-018 / REQ-023: Unused songs edit or delete without a deck prompt; used songs list decks with checkboxes.
- AC-010 / REQ-012: Decks change only after the user applies a selection (skip leaves slides; apply only selected deck ids).
- AC-013 / REQ-015: Edit sync updates linked slides and keeps `librarySongId`.
- AC-013 / REQ-016: Hand-edited linked slides need a second yes before overwrite (edit) or remove (delete).
- Delete never removes slides unless those decks are selected; unlinked/legacy slides untouched.
- Persist / open / Present: after apply, `deck_json` reloads via the same path as `/library/open/:id`; `buildStagedSongSlide` stages updated lyrics (probe PASS). Present two-line staging code unchanged.

Independent evidence: `tsc --noEmit` exit 0; Jest 8 suites / 31 PASS; persist-open-Present probe PASS. Product tip: `f226bdadbe7124f381646208bf5f7a9722c3dadf`.

Next selected: `present-unchanged`. Loops used: 15/24. Do not open a PR.
