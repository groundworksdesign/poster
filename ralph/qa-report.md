# epic-005 QA report — Iris re-gate + proportional previews

Iris re-gate blockers and Roy proportional-preview task passed QA. `completeEpic: true`.

## Blockers (Iris2)

| Item | Result | Evidence |
| --- | --- | --- |
| URL import body consume | PASS | `express.json` only on command routes; unmocked remix + electron e2e |
| SSRF hardening | PASS | DNS/redirect block, timeout, 8MB stream, uniform errors, JSON+same-origin; unit tests |
| Failed URL UX (Race) | PASS | Real error shown; URL input cleared; N1 untouched |
| Thumbnail scale | PASS | Measured preview width (ResizeObserver); unit test 512px → scale 0.4 |
| Large Present images | PASS | `/api/poster/asset` refs; remix e2e >100KB reaches Present |

## REQ-009 Proportional previews (Roy)

| Item | Result | Evidence |
| --- | --- | --- |
| Shared PresentScaledStage | PASS | `PresentScaledStage` used by `PresentFramePreview` (bg picker) and `ProgramThumbnailPanel` |
| Whole-stage CSS scale | PASS | Logical Present frame (1280×720 / non-title band) + `transform: scale(...)`; text inside stage |
| Text-to-slide ratios | PASS | `previewProportions.test.tsx` title/song/general vs Present within 0.02 |

## Server bind choice

**Bound to `127.0.0.1` by default** (`HOST` env overrides). Electron already listens on loopback; LAN Present / remote control is listed as future work in the design guide, not a shipped feature. fetch-image is further limited by same-origin JSON checks.

## Kept green

Stale Present, dedupe, N1/N3/N5, green-screen picture show, ACs, song staging byte-identical to main, existing decks, Iris2 fixes.

## Evidence (local)

- Unit: ssrf/fetch/presentAssets/thumbnail/picker/PresentScaledStage/previewProportions green (90 related tests)
- Prior CI on `cbe04d3` (tsc fix): success
