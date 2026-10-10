# epic-005 QA report — Background images

All todos passed QA (loops 3–21). `completeEpic: true`.

## Present / song staging

- `src/domain/stagedSongSlide.ts` is byte-identical to main.
- `src/presentation/Present/Present.tsx` changed only for background layer rendering under existing song content; staging logic untouched.

## AC coverage

| AC | Result |
| --- | --- |
| AC-001 | Present.background + remix e2e — all slide types |
| AC-002 | Title text-layer separate — unit + Present + remix |
| AC-003 | Deck default / override / Use deck default — DeckBuilder + remix |
| AC-004 | Image picture fitted on top — Present + remix |
| AC-005 | Fill/fit/tile + fill default — domain + UI |
| AC-006 | Dim toward black — Present + picker |
| AC-007 | File/URL embed + remix export/reimport + electron library round-trip |
| AC-008 | Failed URL error + empty field — unit + remix |
| AC-009 | Green screen keeps both images — Present + thumbnail + remix |
| AC-010 | Older decks unchanged — domain + Present + remix |
| AC-011 | Single deck default — domain |
| AC-012 | Unit suite green; song staging + title font-size tests green |

## Evidence

- Unit: 462 passed (`src/`)
- Remix e2e: `remix-background-images.spec.ts` 3/3
- Electron e2e: `electron-background-images.spec.ts` 1/1 (xvfb)
