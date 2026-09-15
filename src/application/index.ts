// Application layer: use cases and ports.
//
// Dependency rule: domain <- application <- adapters / presentation.
// This layer must not import Remix, Electron, or Playwright.
//
// Ports / use cases currently housed here:
// - SessionTransport: directed-send session orchestration (deck <-> present)
//
// Library save/open/backup orchestration remains in adapters/persistence for now
// (bound to sqlite/json I/O). Remix route adapters call those modules directly;
// extract port interfaces here when a second persistence driver appears.

export {
  CHANNEL_DECK_COMMAND,
  CHANNEL_PRESENT_PUSH,
  CHANNEL_PRESENT_EVENT,
  CHANNEL_DECK_EVENT,
  createDeckSession,
  createPresentSession,
} from './SessionTransport';

export type {
  DeckCommand,
  PresentEvent,
  DeckEvent,
  DeckSession,
  PresentSession,
  ProgramThumbnailState,
} from './SessionTransport';
