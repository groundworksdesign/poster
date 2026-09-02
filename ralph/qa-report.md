# QA Report: single-home-focus

**Epic:** epic-004  
**Task:** single-home-focus  
**Branch:** cursor/epic-004-multi-deck-plan-doc-6573  
**Verified at:** 2026-09-02T16:00:00.000Z  
**Persona:** qa (independent; dev notes not trusted)

## Task scope

Keep Home/Library as the only main window (the saved presentations/decks list); opening Home again focuses the existing Home; Open Presentation opens a deck window while Home stays put; Present windows are where slides play (session-scoped children, not a bare `/presentation` from Home).

**Out of scope for this task:** persist-theme-all-windows, program-thumbnail, directed-send changes.

## Tests executed (ralph/AGENT.md)

| Command | Result |
| --- | --- |
| `CI=true pnpm test --watchAll=false --testPathIgnorePatterns=e2e` | 25 suites, **152 passed** (11 skipped) |
| Focused: `homeWindowPolicy\|HomePage.unit\|electron-main.regression` (covered in full run) | included above |
| `CI=true REMIX_PORT=3014 pnpm exec playwright test --config=playwright.remix.config.ts remix-single-home` | **3 passed** |

## Code inspection (independent)

| Check | Finding |
| --- | --- |
| Home is saved-deck Library | `HomePage.tsx` mounts `LibraryPanel` under `home-page-library`; heading Poster |
| Only one Electron Home window | `ensureHomeWindow` + `shouldCreateHomeWindow`; creates only if missing/destroyed; else `focusMainWindow` |
| Second app launch focuses Home | `requestSingleInstanceLock` + `second-instance` -> `ensureHomeWindow` |
| macOS activate | focuses existing Home; recreates only when `mainWindow` gone |
| Window-open cannot spawn second Home | `setWindowOpenHandler`: `classifyOpenUrl` `home` -> deny + focus |
| Open Presentation -> deck, Home stays | `data-testid="open-presentation"` `href="/deck"` + `openDeckWindow` (`window.open` new window); no navigate of Home |
| No bare Present from Home | Home links are only `/deck` variants; no `/presentation` hrefs |
| Bare Present denied in Electron | `present-bare` -> deny + `openDeckWindow()` |
| Session Present allowed | `present-session` (sessionId + presentId) allowed as child window |
| Present plays slides as session children | `DeckBuilder` `Open Present` -> `spawnPresent`; `Present.tsx` requires `sessionId`+`presentId` or shows connect guidance |

## Acceptance criteria mapping

Criteria belonging to **other todos** are marked **out of scope**.

| # | Criterion | Scope | Evidence | Pass |
| --- | --- | --- | --- | --- |
| 1-5 | Directed-send isolation / close / replay | out of scope | REQ-001 already passes | n/a |
| 6 | Only one Home/Library exists. Opening Home again focuses the original Home. Home is the saved-deck list. Present windows play slides. Open Presentation leaves Home in place and opens a deck window. | **in scope** | See must-confirm table + tests below | yes |
| 7-8 | Theme persist | out of scope | -> `persist-theme-all-windows` | n/a |
| 9 | Program thumbnail | out of scope | -> `program-thumbnail` | n/a |
| 10 | No BroadcastChannel slide bus | regression | unchanged; prior REQ-001 | n/a (not this task) |

### Operator must-confirm

| Must confirm | Evidence | Pass |
| --- | --- | --- |
| Only one Home/Library (saved-deck list) | Single `mainWindow` Home; `LibraryPanel` on Home; policy + electron regression tests | yes |
| Opening Home again focuses existing Home | `ensureHomeWindow` / `shouldCreateHomeWindow` false when exists; second-instance + activate; `homeWindowPolicy.test.js` | yes |
| Open Presentation opens deck; Home stays | HomePage unit + `remix-single-home` E2E (Home heading still visible; deck URL `/deck`) | yes |
| Present is session-scoped, not bare `/presentation` from Home | No bare Present links on Home; E2E asserts none; bare `/presentation` shows deck-builder guidance; Electron denies `present-bare` | yes |

## Task-level deliverables

| Deliverable | Pass |
| --- | --- |
| Electron single-Home focus policy | yes |
| Home Open Presentation -> deck | yes |
| Tests for REQ-002 Validation item | yes (`homeWindowPolicy`, `HomePage.unit`, electron regression, `remix-single-home`) |

## Known debt (not blocking this task)

- `e2e/remix-dev-render.spec.ts` `/deck` with `waitUntil: 'networkidle'` can time out while poster poll keeps connections open. Unrelated to single-Home behavior; `remix-single-home` and deck smoke using `domcontentloaded` pass.

## Verdict

**PASS** — `single-home-focus` meets REQ-002 scoped requirements and the operator must-confirm checks. Verified by independent code inspection, full Jest suite, and remix single-home E2E.
