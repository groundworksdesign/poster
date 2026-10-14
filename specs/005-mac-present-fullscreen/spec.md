> **EXAMPLE ONLY** — sample spec for the Spec Kit → Ralph handoff trial. Not an approved epic.

# Feature Specification: Mac Present Fullscreen

**Feature Branch**: `005-mac-present-fullscreen`
**Status**: Approved

## User Scenarios
### User Story 1 - Operator goes fullscreen with F (Priority: P1)
In the Mac Electron app, pressing F during Present toggles native fullscreen; Escape exits.

## Requirements
- **FR-001**: In Mac Electron Present, F toggles native `BrowserWindow.setFullScreen`.
- **FR-002**: If the menu bar is still visible after native fullscreen, fall back to `setSimpleFullScreen`.
- **FR-003**: Escape exits fullscreen; F toggles back out.
- **FR-004**: Present never auto-enters fullscreen on open and shows no display picker.
- **FR-005**: Browser Present keeps HTML `requestFullscreen` unchanged.
- **FR-006**: Release notes include a bullet for the change.

## Success Criteria
- **SC-001**: On macOS, F hides menu bar and dock within 1s; Escape restores the window.
- **SC-002**: Browser Present behavior is byte-for-byte unchanged in existing tests.
