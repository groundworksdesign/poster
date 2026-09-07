---
name: Next-cycle Present/deck fixes + durable library
epic: epic-005
status: in_progress
overview: "Epic-005 items 1–7 are shipped (product fixes + regression harness). Remaining: packaged/Electron acceptance evidence only. Do not reimplement directed-send, epic-004, or Items A–E."
todos:
  - id: present-close-list
    content: Closing Present removes it from the deck child list.
    status: done
  - id: end-blanks-present
    content: End blanks Present; Start after End shows first slide.
    status: done
  - id: on-program-thumbnail
    content: On-program thumbnail fidelity + placement with Presentation controls.
    status: done
  - id: theme-persist-relaunch
    content: Theme survives quit+relaunch.
    status: done
  - id: library-poster-home
    content: Default ~/.poster; migrate; Change… re-points leave old.
    status: done
  - id: home-no-open-present-guard
    content: Home has no Open Present CTA.
    status: done
  - id: regression-harness
    content: Complete unit/integration/smoke + CI for A–E and Home guard.
    status: done
  - id: docs-sync
    content: Sync requirements/epic/README acceptance to shipped behavior.
    status: done
  - id: packaged-acceptance
    content: Packaged/Electron smoke evidence for key flows.
    status: pending
isProject: false
---

# Epic-005 remaining work (re-anchored)

**Repo:** `/Users/hpractv/ralph-runs/poster` only. Never implement in `izep/ralph-gui`.

## Already done (do not redo)

Tasks 1–7 shipped: Present close list cleanup, End blank, on-program thumbnail, theme persist, `~/.poster` library, Home Open Present guard, complete regression harness (unit/integration + Remix/Electron smoke, wired into PR CI).

## Remaining backlog only

9. Validate packaged acceptance flows (Electron / packaged smoke + evidence in `ralph/qa-report.md`)

## Hard rules for planning

- Do **not** emit tasks to port directed-send / rebuild session graph / re-do Items A–E product features or the harness.
- If planning runs, output only remaining unfinished work among 8–9 (or mark complete when packaged acceptance lands).
- Preserve existing task ids 1–9; never invent a parallel duplicate epic.