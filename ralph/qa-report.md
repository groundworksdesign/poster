# epic-005 QA report — Iris re-gate fix (0c0ec8f → final)

Iris re-gate blockers passed QA. `completeEpic: true`.

## Blockers

| Item | Result | Evidence |
| --- | --- | --- |
| URL import body consume | PASS | `express.json` only on command routes; unmocked remix + electron e2e |
| SSRF hardening | PASS | DNS/redirect block, timeout, 8MB stream, uniform errors, JSON+same-origin; unit tests |
| Failed URL UX (Race) | PASS | Real error shown; URL input cleared; N1 untouched |
| Thumbnail scale | PASS | Measured preview width (ResizeObserver); unit test 512px → scale 0.4 |
| Large Present images | PASS | `/api/poster/asset` refs; remix e2e >100KB reaches Present |

## Server bind choice

**Bound to `127.0.0.1` by default** (`HOST` env overrides). Electron already listens on loopback; LAN Present / remote control is listed as future work in the design guide, not a shipped feature. fetch-image is further limited by same-origin JSON checks.

## Kept green

Stale Present, dedupe, N1/N3/N5, green-screen picture show, ACs, song staging byte-identical to main, existing decks.

## Evidence (local)

- Unit: ssrf/fetch/presentAssets/thumbnail/picker green
- Remix e2e background: 7/7
- Electron e2e background: 2/2 (incl. unmocked URL)
