---
name: Next-cycle Present/deck fixes + durable library
epic: epic-005
status: approved
overview: "Fix End blank, theme persist across quit+relaunch, Present close child-list cleanup, on-program thumbnail fidelity+placement; ship durable presentations library at ~/.poster with migrate + settings re-point."
todos:
  - id: present-close-list
    content: Closing Present (window X) removes it from the deck child Present list and directed-send targets.
    status: pending
  - id: end-blanks-present
    content: End blanks Present (directed clear); Start after End shows first slide.
    status: pending
  - id: on-program-thumbnail
    content: On-program thumbnail matches Present program-out and sits with Presentation controls (not above deck metadata).
    status: pending
  - id: theme-persist-relaunch
    content: Theme selection survives full quit+relaunch on Home/deck/Present; live apply stays green; prefs not under AppImage cwd.
    status: pending
  - id: library-poster-home
    content: Default library ~/.poster; optional Change… re-points and leaves old; one-time migrate cwd sqlite/JSON; survive uninstall as far as OS allows.
    status: pending
  - id: home-no-open-present-guard
    content: Regression guard — Home must not offer Open Present (Present only from deck).
    status: pending
isProject: false
---

# Epic-005: Next-cycle Present/deck fixes + durable library

## Goal

Ship the locked next-cycle fixes with unit/regression backpressure (tests + AC). Auto-update remains parked.

## Locked decisions (Roy 2026-09-06)

1. Library path Change…: **re-point and leave old** (no automatic move).
2. First-run: **default `~/.poster`** with optional Change… (no forced picker).
3. Impl order: either fine — prefer C → A → D → B → E.
4. Merge gate: **Jack harness confirm** before merge.

## Items

### C — Close Present drops from deck list
Window X must unregister child; UI list updates; directed send excludes closed id; close one of N leaves others. Unit + smoke required.

### A — End blanks Present
End directed blank/clear; Present shows blank; Start after End → first slide. Start/Next/Prev/Go stay green. Unit + smoke required.

### D — On-program thumbnail
Not empty-panel: true program-out preview (same source as present-push, blank after End); place with Presentation controls, not above metadata. Unit model + placement + smoke; Mac fidelity = content equivalence.

### B — Theme persist
Durable prefs under user-owned root (not install cwd). Quit+relaunch restores theme. Live apply stays green.

### E — Library `~/.poster`
Default `~/.poster`; migrate cwd poster.sqlite/JSON once; Change… re-points leave-old; survive cwd wipe / package uninstall as far as OS allows.

### Guard
Home has no Open Present CTA.

## Backpressure (izep/ralph-gui style)

Dev must run relevant build/lint/tests and only emit done after validation passes.
QA is adversarial: re-run checks; emit verified only if AC met and checks pass; otherwise failed with actionable feedback.
Every defect needs automated assertions that would fail on today\'s bugs (see `/Users/hpractv/ralph-runs/next-cycle-test-harness.md`).

## Out of scope

Auto-update / electron-updater. New Present features beyond the items above.

## References

- Plan: `/Users/hpractv/ralph-runs/next-cycle-fixes-and-library.md`
- Jack harness: `/Users/hpractv/ralph-runs/next-cycle-test-harness.md`
