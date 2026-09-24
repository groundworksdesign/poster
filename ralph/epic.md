---
name: First title follows deck Font size
epic: epic-002
status: approved
overview: "Stop baking fixed title/subtitle font sizes on the first slide of a new deck so deck Font size updates that title like every other slide; leave existing baked sizes alone; cover with an automated precedence check; mention the fix in release notes."
todos:
  - id: stop-baking-createNewDeck
    content: "In createNewDeck(), do not set titleFontSize or subTitleFontSize on the seeded first TITLE slide (match addSlide(TITLE) inheritance from GENERAL)."
    status: pending
  - id: verify-font-control-new-deck
    content: "After creating a new deck, changing deck Font size updates the first title and subtitle in Present overlay and the editor program thumbnail."
    status: pending
  - id: preserve-existing-baked
    content: "Decks that already have baked titleFontSize / subTitleFontSize keep those values; do not strip on open or rewrite on Font size change."
    status: pending
  - id: automated-precedence-check
    content: "Add or extend an automated check (Jack’s precedence cases or equivalent unit test) that fails if createNewDeck again bakes sizes that override GENERAL fontSize."
    status: pending
  - id: release-notes
    content: "Include a user-facing release-notes bullet for this fix on the PR and the GitHub Release / changelog for the version that ships it (new decks’ first title now follows Font size; older decks with fixed title sizes unchanged)."
    status: pending
isProject: false
---

# Epic 002: First title follows deck Font size

## Goal

On a **new** deck, the first title slide responds to the deck Font size control the same way other slides do. Existing decks that already have baked title/subtitle sizes are left alone. The fix is gated by an automated precedence check and called out in release notes.

## Requirements

- **REQ-001** `createNewDeck()` must not bake `titleFontSize` or `subTitleFontSize` on the seeded first TITLE slide.
- **REQ-002** After a new deck is created, changing deck Font size updates that first title and subtitle in Present and the editor program thumbnail.
- **REQ-003** Newly added TITLE slides and non-title slides continue to inherit GENERAL font size as they do today.
- **REQ-004** Opening or editing a deck that already has baked `titleFontSize` / `subTitleFontSize` leaves those values unchanged (no strip-on-open, no clear-on-Font-size-change).
- **REQ-005** Release notes for the shipping version mention this fix in user-facing language.

## Current baseline (Jack QA, tip `7c947cd`)

- `createNewDeck()` seeds `titleFontSize: '48px'` / `subTitleFontSize: '28px'` on the first title.
- Present / thumbnail resolve with `titleFontSize ?? style.fontSize`, so baked values win over GENERAL.
- `addSlide(TITLE)` does not bake those fields → inherits correctly (user workaround).
- Evidence: attached FINDINGS and `check-font-size-precedence.mjs`.

## Out of scope

- Stripping or rewriting baked sizes on existing decks.
- Changing Font size behavior for non-title slides beyond regression.
- Auto-update / electron-updater.
- Unrelated Present / library items A–E from the prior next-cycle plan.

## Implementation plan

1. Remove (or omit) `titleFontSize` / `subTitleFontSize` from the first-slide seed in `createNewDeck()` so it matches `addSlide(TITLE)`.
2. Keep send / Present / thumbnail precedence as-is unless a tiny comment is needed; do not change behavior for slides that still carry baked fields.
3. Land Jack’s precedence check (or equivalent) under the repo’s existing test layout so CI fails if baking returns.
4. Add a release-notes bullet on the PR body and ensure it appears on the GitHub Release / changelog for that version.

## Primary files (expected)

- `src/presentation/Deck/DeckBuilder.tsx` (`createNewDeck`)
- Present / thumbnail paths only if a test or comment is added (`Present.tsx`, `ProgramThumbnailPanel.tsx`, `resolveSlideStyle.ts`)
- New or extended test under `tests/` or `src/**/*.test.*` (align with Jack’s harness)

## Definition of Done

- [ ] New deck → change Font size → first title and subtitle update in Present and editor program thumbnail.
- [ ] Other slides and newly added TITLE slides still follow Font size.
- [ ] A deck with pre-existing baked title sizes still shows those baked sizes (unchanged).
- [ ] Automated precedence check passes on tip.
- [ ] PR and shipping release notes include a clear user-facing bullet for this fix.
- [ ] No fix merged until Jack (merge gate) says go.

## Validation

| Check | Layer | Fails if |
|-------|-------|----------|
| createNewDeck + GENERAL fontSize change | Unit / Jack precedence script | First title overlay stays at baked 48px/28px while GENERAL changes |
| addSlide(TITLE) + GENERAL change | Unit | Added title ignores GENERAL |
| Non-title + GENERAL change | Unit | Body slide ignores GENERAL |
| Fixture/old slide with baked sizes | Unit | Baked sizes are cleared or overwritten without product intent |

## Status

`approved` — Roy go received; coding loop in progress.
