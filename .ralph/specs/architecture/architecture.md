# Architecture Overview — Poster

## Tech stack (current + target)
- React 18
- TypeScript
- Remix + Vite (target migration)
- BroadcastChannel for window-to-window communication
- Vitest + React Testing Library (unit/integration)
- Playwright (minimal smoke)

## High level runtime architecture
```mermaid
flowchart LR
  subgraph Builder[/deck]
    DeckBuilder[DeckBuilder UI] -->|postMessage(PresentData)| Channel[BroadcastChannel('presentation')]
    DeckBuilder --> SongParser[parseSongXML]
  end

  subgraph Cast[/presentation]
    Presentation[Presentation renderer] --> LyricsDisplay[2-line LyricsDisplay]
    Presentation --> SlideRenderer[Slide renderers by type]
    Channel --> Presentation
  end
```

## Key modules to keep testable
- `parseSongXML` and song parsing edge cases.
- Deck manipulation helpers (add/move/duplicate/delete).
- Broadcast “partial update semantics”:
  - navigation commands update only lyrics state
  - they do not clear the currently-rendered slide unintentionally
- Lyrics state:
  - resets when song payload changes
  - advances exactly 2 lines per command

## Test approach
- Unit tests for pure logic modules.
- Integration tests:
  - Render cast UI
  - Fake `BroadcastChannel`
  - Verify the DOM changes as messages are posted.
- Coverage focus:
  - hit edge cases in XML parsing
  - hit navigation boundaries
  - hit serialization/deserialization round-trips

