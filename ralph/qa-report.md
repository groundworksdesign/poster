# QA Report: persist-theme-all-windows

**Epic:** epic-004  
**Task:** persist-theme-all-windows  
**Branch:** cursor/epic-004-multi-deck-plan-doc-6573  
**Verified at:** 2026-09-02T16:15:00.000Z  
**Persona:** qa (independent; dev notes not trusted)

## Task scope

Persist the selected theme including the dropdown across app restart and across Home close/reopen, and apply that theme to Home, deck builders, and Present windows.

**Out of scope for this task:** program-thumbnail, directed-send, single-home changes.

## Tests executed (ralph/AGENT.md)

| Command | Result |
| --- | --- |
| `CI=true pnpm test --watchAll=false --testPathIgnorePatterns=e2e` | 26 suites, **158 passed** (11 skipped) |
| Focused: `useTheme\|HomePage.unit\|Present.theme` | **3 suites, 11 passed** |
| `CI=true REMIX_PORT=3015 pnpm exec playwright test --config=playwright.remix.config.ts remix-theme-persist` | **3 passed** |

## Code inspection (independent)

| Check | Finding |
| --- | --- |
| Persist key | `THEME_STORAGE_KEY = 'poster-theme'` in `useTheme.ts`; `applyTheme` writes localStorage |
| Hydrate + dropdown | `useTheme` SSR-safe starts `light`, then `readStoredTheme` + `applyTheme` on mount; Home select bound to `[theme, setTheme]` with `aria-label="Select theme"` |
| Home reopen / remount | Remount re-reads storage; unit test remounts Home and asserts dropdown + `data-theme` |
| Deck applies theme | `DeckBuilder.tsx` calls `useTheme()` on mount |
| Present applies theme | `Present.tsx` calls `useTheme()` on mount; `Present.theme.test.tsx` asserts `data-theme` from storage |
| FOUC / restart paint | `app/root.tsx` inlines `themeInitScript` reading `poster-theme` before paint |
| Cross-window sync | `storage` + `visibilitychange` listeners in `useTheme` |

## Acceptance criteria mapping

Criteria belonging to **other todos** are marked **out of scope**.

| # | Criterion | Scope | Evidence | Pass |
| --- | --- | --- | --- | --- |
| 1-5 | Directed-send isolation / close / replay | out of scope | REQ-001 already passes | n/a |
| 6 | Single Home | out of scope | REQ-002 already passes | n/a |
| 7 | After choosing a theme (dropdown shows it), quit and reopen the app: the same theme is applied on Home, decks, and Presents, and the dropdown still shows that choice. | **in scope** | Unit: Home remount restore; useTheme remount; Present mount from storage. E2E: new browser context with storageState restores dropdown + `data-theme`. E2E: deck + Present pages get stored theme. Screenshots: Home before/after restart, deck, Present. | yes |
| 8 | Close the main Home window and open it again: same theme restore as above. | **in scope** | Unit remount Home; E2E navigate away to `/deck` then back to `/` keeps dropdown + `data-theme`. | yes |
| 9 | Program thumbnail | out of scope | -> `program-thumbnail` | n/a |
| 10 | No BroadcastChannel slide bus | regression | unchanged; prior REQ-001 | n/a (not this task) |

### Operator must-confirm

| Must confirm | Evidence | Pass |
| --- | --- | --- |
| Selected theme including dropdown restores on app restart | `remix-theme-persist` new-context + storageState; Home unit remount; FOUC script + hydrate | yes |
| Theme + dropdown restore when Home closed and opened again | E2E Home->deck->Home; Home unit remount | yes |
| Theme applies to Home | HomePage `useTheme` + dropdown; E2E + screenshot `theme_home_dracula.png` | yes |
| Theme applies to deck builders | DeckBuilder `useTheme()`; E2E deck poll `data-theme`; screenshot `theme_deck_dracula.png` | yes |
| Theme applies to Present windows | Present `useTheme()`; Present.theme unit; E2E Present poll `data-theme`; screenshot `theme_present_dracula.png` | yes |

## Task-level deliverables

| Deliverable | Pass |
| --- | --- |
| Persist theme + dropdown across restart | yes |
| Persist across Home close/reopen | yes |
| Apply on Home, decks, Present | yes |
| Tests for REQ-003 Validation items | yes (`useTheme.unit`, HomePage theme tests, Present.theme, `remix-theme-persist`) |

## Verdict

**PASS** — `persist-theme-all-windows` meets REQ-003 scoped requirements and the operator must-confirm checks. Verified by independent code inspection, full Jest suite, focused theme unit tests, and remix theme-persist E2E.
