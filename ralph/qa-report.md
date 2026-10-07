# Feedback

## import-review-screen QA PASS

- AC-003 / REQ-003: Gathered book JSON + Poster song XML/JSON parse into import candidates.
- AC-004 / REQ-004: Multi-song opens review checklist; nothing POSTs until Import confirm (select all/none = whole book or subset).
- AC-005 / REQ-005 / REQ-018 / AC-015: No-lyrics section only when needed; group choice title only (default) or skip; no silent import of empty verses.
- AC-006 / REQ-006 / REQ-019 / AC-015: Title match shows existing/incoming number + lyrics; default keep both; replace and skip offered; keep both creates sibling (two same titles can exist).
- AC-022 / REQ-022 / AC-018 (import): Single clean song skips review and imports; clean multi-song one Import click; problem sections only when they apply. (AC-018 REQ-023 unused-song deck prompt deferred to linked-update-decks.)
- Pam: one review screen, checklist all checked, one Import button, defaults as above.
- Open deck: DeckBuilder untouched; import API writes song library only.

Independent: tsc exit 0; Jest 2 suites / 11 PASS.

Next selected: `add-slide-chooser`. Loops used: 7/24. Do not open a PR.
