---
name: Next-cycle Present/deck fixes + durable library
epic: epic-005
status: in_progress
overview: "Epic-005 is fully shipped: items 1–9 (product fixes, regression harness, docs sync, packaged/Electron acceptance evidence) plus the Electron Home Change... re-point fix and its guard. Packaged acceptance is marked shipped; no canonical doc claims the re-point control is broken. Do not reimplement directed-send, epic-004, or Items A–E."
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
    status: done
  - id: change-repoint-fix
    content: Electron Home Change... re-point works (native folder picker bridge, not window.prompt).
    status: done
isProject: false
---

# Epic-005 complete (re-anchored)

**Repo:** `/Users/hpractv/ralph-runs/poster` only. Never implement in `izep/ralph-gui`.

## All shipped (do not redo)

Tasks 1–9 complete: Present close list cleanup, End blank, on-program thumbnail, theme persist, `~/.poster` library (default + migrate + re-point leave-old), Home Open Present guard, complete regression harness (unit/integration + Remix/Electron smoke wired into PR CI), acceptance docs sync, and packaged/Electron acceptance evidence in `ralph/qa-report.md`.

Additionally, the Electron Home **Change...** re-point control is fixed: it uses a native folder-picker IPC bridge (`poster:pick-library-folder` via `dialog.showOpenDialog`) when `window.poster` is present, with the browser `window.prompt` fallback otherwise. The prior packaged-only `window.prompt` finding (QA finding 2) is closed; re-point is no longer broken on any surface.

## Hard rules for planning

- Do **not** emit tasks to port directed-send / rebuild session graph / re-do Items A–E product features, the harness, or the docs sync.
- If planning runs, output no new work: the epic is shipped. Never invent a parallel duplicate epic or overwrite task ids 1–12.