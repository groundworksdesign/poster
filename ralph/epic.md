---
name: Next-cycle Present/deck fixes + durable library
epic: epic-005
status: in_progress
overview: "Finish remaining epic-005 work only: regression harness, packaged acceptance, docs. Items A–E product fixes (tasks 1–6) are already done — do not reimplement directed-send or epic-004."
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
    status: pending
  - id: docs-sync
    content: Sync requirements/epic/README acceptance to shipped behavior.
    status: pending
  - id: packaged-acceptance
    content: Packaged/Electron smoke evidence for key flows.
    status: pending
isProject: false
---

# Epic-005 remaining work (re-anchored)

**Repo:** `/Users/hpractv/ralph-runs/poster` only. Never implement in `izep/ralph-gui`.

## Already done (do not redo)

Tasks 1–6 shipped: Present close list cleanup, End blank, on-program thumbnail, theme persist, `~/.poster` library, Home Open Present guard.

## Remaining backlog only

7. Complete regression test harness (+ CI wiring)
8. Synchronize acceptance documentation
9. Validate packaged acceptance flows

## Hard rules for planning

- Do **not** emit tasks to port directed-send / rebuild session graph / re-do Items A–E product features.
- If planning runs, output only remaining unfinished work among 7–9 (or complete when those three are done).
- Preserve existing task ids 1–9; never invent a parallel 39+ duplicate epic.
