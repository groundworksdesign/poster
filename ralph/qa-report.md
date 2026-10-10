# epic-005 QA report — Iris fix loop (PR #28)

Iris gate blockers and also-fix items passed QA (loops 1–6). `completeEpic: true`.

## Blockers

| Item | Result | Evidence |
| --- | --- | --- |
| Stale Present (LIVE-OLDDECK / LIVE-CLEAR) | PASS | `applyPresentPayload` + DeckBuilder always-send null; remix e2e LIVE-* |
| REQ-008 no-CORS URL fetch | PASS | `/api/poster/fetch-image` + `fetchImageBytes` + `embedImageFromUrl` proxy |
| Tile / fit preview parity | PASS | `presentFrame` + `PresentFramePreview` in picker and program thumbnail |
| N1 failed URL | PASS | Picker does not call onChange; no empty override on inherit |
| N3 legacy image picture | PASS | Present uses `file ?? style.backgroundImage` with whole-slide layer |
| N5 images-only file picker | PASS | `accept="image/*"` + `isImageFile` validation |
| N4 image dedupe | PASS | `deck.embeddedImages` + `embed:<hash>` refs; old inline data URLs load |
| Green screen image picture | PASS | `SHOW_IMAGE_PICTURE_IN_GREEN_SCREEN = true` (Roy); Present + thumbnail + e2e |
| Real-key e2e | PASS | `pressSequentially` for URL field in remix background e2e |

## Present / song staging

- `src/domain/stagedSongSlide.ts` is byte-identical to main.
- Title font-size behaviour unchanged (unit coverage).

## AC coverage (regression)

| AC | Result |
| --- | --- |
| AC-001–012 | PASS (unit + remix e2e; electron AC-007 round-trip) |

## Evidence (local QA)

- Unit: 485 passed (`src/`, 71 suites)
- Remix e2e: `remix-background-images.spec.ts` 5/5
- Electron e2e: `electron-background-images.spec.ts` 1/1 (xvfb)
