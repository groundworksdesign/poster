# Tasks: Mac Present Fullscreen
## Phase 1: Setup
- [ ] T001 Add preload bridge + IPC channel present:toggle-fullscreen (FR-001)
## Phase 2: User Story 1
- [ ] T002 [US1] Main process: toggle setFullScreen on IPC (FR-001, SC-001)
- [ ] T003 [US1] Fallback to setSimpleFullScreen when menu bar remains (FR-002)
- [ ] T004 [US1] Present keydown: F toggles, Escape exits (FR-003, SC-001)
- [ ] T005 [P] [US1] Guard: no auto-FS on open, no display picker (FR-004)
- [ ] T006 [P] Browser path keeps requestFullscreen; regression test (FR-005, SC-002)
- [ ] T007 [P] Release-notes bullet (FR-006)
