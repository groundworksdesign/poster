# Release notes — epic-003 (Mac Present fullscreen)

## User-facing

- **Mac Present fullscreen:** Pressing **F** in Present on the Mac app now uses native fullscreen (with a stronger fallback when the menu bar still shows). Press **F** or **Escape** to return to a normal window. Present still opens windowed — fullscreen only when you ask for it.

## Operator note

macOS System Settings → Desktop & Dock → “Automatically hide and show the menu bar” set to **Never** can keep the menu bar visible in standard fullscreen. Poster falls back to a stronger fullscreen mode in those stubborn cases so program output can still go edge-to-edge. Easy exit with **F** / **Escape** is always available (no kiosk lock).

## Out of scope (unchanged)

- Browser / Remix Present still uses HTML fullscreen only.
- No display picker; fullscreen applies to the Present window on the display it already occupies.
