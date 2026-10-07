# Feedback

## fix-add-slide-import-review QA (fix loop 7) — FAIL

`<status>failed</status>`

### What passed (REQ-022 / AC-007 / AC-009 / AC-014)

| Check | Result |
| --- | --- |
| Chooser + ImportSongsReview share `ImportReviewScreen` | PASS (not a parallel copy) |
| Both use `buildImportReviewPlan` / `defaultImportSelections` / `resolveImportSelections` | PASS |
| Chooser: no-lyrics, title-match (number + lyrics preview), keep_both default | PASS (unit + e2e) |
| Whole-book/subset via checklist select-all/none/checkboxes | PASS (shared component) |
| Also-save unchecked → no `/import` or `/save` POST | PASS (unit) |
| Insert after selection; deck not replaced | PASS (DeckBuilder splice + e2e keeps Title slide) |
| `pnpm test:e2e:remix` | 52 + 3 PASS |

### What failed

**Full Jest:** `config-path-alignment.test.js` — `test:e2e:remix` is now  
`pnpm run test:e2e:remix:dev && pnpm run test:e2e:remix:song-library`  
and no longer matches `/tests\/e2e\//`. Child scripts do point at Playwright configs.

### Required fix (same task → DEV)

Update the alignment test to accept the compound script (assert `test:e2e:remix:dev` / `test:e2e:remix:song-library` configs, or that the umbrella script invokes them).

`passes:false`.
