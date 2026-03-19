# Ralph Learnings

This document accumulates durable learnings across loop iterations.




## Copilot iteration — session plan & verification (2026-03-19)

## Song flow design (2026-03-19)

Decided to represent loaded songs as a single SlideType.SONG containing full SongData (title/author/verses), and to send navigation-only updates via PresentData.data.lyricsNavigation. This keeps song parsing and serialization separate from rendering (LyricsDisplay renders 2-lines-per-segment and Presentation manages the current segment index). It simplifies editing and testing: deck JSON round-trips keep the full SongData payload.

## Remix scaffold note (2026-03-19)
Created /app scaffold for Remix route porting; full Remix install & run blocked by environment (no network). Files ported: PresentTypes, Broadcast (browser-friendly), songParser, LyricsDisplay, SlideDisplay, Deck route, Presentation route.

## Green-screen rendering (2026-03-19)
When using green-screen mode (useGreenScreen=true) the presentation should render the body background as the chroma key color while making slide content backgrounds transparent. Implemented: Presentation overrides slide background to transparent when green-screening, and honors backgroundImage, backgroundSize, backgroundPosition and horizontal/vertical alignment fields to allow slide content to be positioned and composited correctly.
