# Architecture Overview — Poster

## Tech stack (current + target)
- React 18 + TypeScript
- **Now:** Create React App (`react-scripts` / webpack) for `src/`
- **Target:** Remix + Vite app shell; `app/` becomes the real entry, sharing components with extracted modules
- BroadcastChannel for window-to-window communication
- Jest + React Testing Library (current unit/integration)
- Playwright (minimal smoke)

## High level runtime architecture
```mermaid
flowchart LR
  subgraph Builder[/deck]
    DeckBuilder[DeckBuilder UI] -->|postMessage PresentData| Channel[BroadcastChannel presentation]
    DeckBuilder --> ResolveStyle[resolveSlideStyle]
    DeckBuilder --> SongParser[parseSongXML]
  end

  subgraph Cast[/presentation]
    Presentation[Presentation renderer] --> LyricsDisplay[2-line LyricsDisplay]
    Presentation --> SlideRenderer[Slide renderers by type]
    Channel --> Presentation
  end
```

## Key modules to keep testable
- `resolveSlideStyle` merge semantics and edge cases (missing keys, partial overrides).
- `parseSongXML` and song parsing edge cases.
- Deck manipulation helpers (add/move/duplicate/delete) and CRUD sync to cast (`lastSentSlideId` or equivalent).
- Broadcast partial-update semantics for lyrics navigation.
- Lyrics state: reset when song payload changes; advance two lines per step.

## Test approach
- Unit tests for pure logic modules (especially style merge + parsers).
- Integration tests: render cast UI, fake `BroadcastChannel`, assert DOM updates.
- Playwright: critical two-window flow; update `webServer` when default dev command changes to Remix+Vite.
