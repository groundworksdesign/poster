/**
 * Contract tests for the PresentData broadcast payload.
 *
 * These tests lock down the shape and semantics of every message variant sent
 * over the BroadcastChannel('presentation') channel so that changes to
 * PresentData, Slide, or the Presentation receiver surface regressions quickly.
 *
 * Variants covered:
 *   1. Slide-only send
 *   2. Message-only send
 *   3. Lyrics-navigation partial update (next / previous / goToVerse)
 *   4. useGreenScreen flag (true / false)
 *
 * Part A: pure unit tests -- no DOM, no channel needed.
 * Part B: receiver-side tests -- Presentation component + FakeBroadcastChannel.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import {
  PresentData,
  SlideType,
  Slide,
} from '../Present/PresentTypes';
import Presentation from '../Present/Present';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeSlide = (overrides: Partial<Slide> = {}): Slide => ({
  type: SlideType.GENERAL,
  title: 'Contract Test Slide',
  style: { backgroundColor: '#000', color: '#fff' },
  ...overrides,
});

const makeSongSlide = (): Slide =>
  makeSlide({
    type: SlideType.SONG,
    title: 'Contract Song',
    lyrics: {
      title: 'Contract Song',
      verses: [
        { number: 1, lines: ['Verse1 Line1', 'Verse1 Line2', 'Verse1 Line3', 'Verse1 Line4'] },
      ],
    },
  });

// ---------------------------------------------------------------------------
// FakeBroadcastChannel (routes messages between instances on the same name)
// ---------------------------------------------------------------------------

class FakeBroadcastChannel {
  static channels: Record<string, FakeBroadcastChannel[]> = {};
  name: string;
  onmessage: ((e: { data: unknown }) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.channels[name] = FakeBroadcastChannel.channels[name] || [];
    FakeBroadcastChannel.channels[name].push(this);
  }

  postMessage(msg: unknown) {
    (FakeBroadcastChannel.channels[this.name] || []).forEach(ch => {
      if (ch !== this && typeof ch.onmessage === 'function') {
        ch.onmessage({ data: msg });
      }
    });
  }

  close() {
    FakeBroadcastChannel.channels[this.name] = (
      FakeBroadcastChannel.channels[this.name] || []
    ).filter(ch => ch !== this);
  }
}

beforeEach(() => {
  (global as any).BroadcastChannel = FakeBroadcastChannel;
});

afterEach(() => {
  delete (global as any).BroadcastChannel;
  FakeBroadcastChannel.channels = {};
});

// ===========================================================================
// Part A: PresentData shape -- pure unit tests (no DOM)
// ===========================================================================

describe('PresentData -- payload shape contract', () => {
  // -------------------------------------------------------------------------
  // Variant 1: slide-only send
  // -------------------------------------------------------------------------
  describe('slide-only send', () => {
    it('sets slide to the provided Slide object', () => {
      const slide = makeSlide();
      const payload = new PresentData({ slide });
      expect(payload.slide).toBe(slide);
    });

    it('leaves message null when not provided', () => {
      const payload = new PresentData({ slide: makeSlide() });
      expect(payload.message).toBeNull();
    });

    it('leaves data null when not provided', () => {
      const payload = new PresentData({ slide: makeSlide() });
      expect(payload.data).toBeNull();
    });

    it('leaves useGreenScreen null when not provided', () => {
      const payload = new PresentData({ slide: makeSlide() });
      expect(payload.useGreenScreen).toBeNull();
    });

    it('preserves slide type for TITLE slides', () => {
      const slide = makeSlide({ type: SlideType.TITLE, title: 'Welcome' });
      const payload = new PresentData({ slide });
      expect(payload.slide?.type).toBe(SlideType.TITLE);
      expect(payload.slide?.title).toBe('Welcome');
    });

    it('preserves slide type for SONG slides', () => {
      const slide = makeSongSlide();
      const payload = new PresentData({ slide });
      expect(payload.slide?.type).toBe(SlideType.SONG);
      expect(payload.slide?.lyrics).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Variant 2: message-only send
  // -------------------------------------------------------------------------
  describe('message-only send', () => {
    it('sets message to the provided string', () => {
      const payload = new PresentData({ message: 'Now Live' });
      expect(payload.message).toBe('Now Live');
    });

    it('leaves slide unset on message-only payload', () => {
      const payload = new PresentData({ message: 'Now Live' });
      expect(payload.slide).toBeUndefined();
    });

    it('leaves data null when not provided', () => {
      const payload = new PresentData({ message: 'Now Live' });
      expect(payload.data).toBeNull();
    });

    it('accepts an empty string message (clear message command)', () => {
      const payload = new PresentData({ message: '' });
      expect(payload.message).toBe('');
    });

    it('accepts null message explicitly', () => {
      const payload = new PresentData({ message: null });
      expect(payload.message).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Variant 3: lyrics-navigation partial update
  // -------------------------------------------------------------------------
  describe('lyrics-navigation partial update', () => {
    it('carries lyricsNavigation in data with "next" command', () => {
      const payload = new PresentData({ data: { lyricsNavigation: { command: 'next' } } });
      expect(payload.data).toEqual({ lyricsNavigation: { command: 'next' } });
    });

    it('leaves slide unset for a navigation-only update', () => {
      const payload = new PresentData({ data: { lyricsNavigation: { command: 'next' } } });
      expect(payload.slide).toBeUndefined();
    });

    it('leaves message null for a navigation-only update', () => {
      const payload = new PresentData({ data: { lyricsNavigation: { command: 'next' } } });
      expect(payload.message).toBeNull();
    });

    it('carries lyricsNavigation with "previous" command', () => {
      const payload = new PresentData({ data: { lyricsNavigation: { command: 'previous' } } });
      expect(payload.data.lyricsNavigation.command).toBe('previous');
    });

    it('carries lyricsNavigation with "goToVerse" command and verseIndex', () => {
      const payload = new PresentData({
        data: { lyricsNavigation: { command: 'goToVerse', verseIndex: 3 } },
      });
      expect(payload.data.lyricsNavigation.command).toBe('goToVerse');
      expect(payload.data.lyricsNavigation.verseIndex).toBe(3);
    });

    it('carries verseIndex of 0 correctly (not falsy-filtered)', () => {
      const payload = new PresentData({
        data: { lyricsNavigation: { command: 'goToVerse', verseIndex: 0 } },
      });
      expect(payload.data.lyricsNavigation.verseIndex).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Variant 4: useGreenScreen flag
  // -------------------------------------------------------------------------
  describe('useGreenScreen flag', () => {
    it('is true when explicitly set to true', () => {
      const payload = new PresentData({ slide: makeSlide(), useGreenScreen: true });
      expect(payload.useGreenScreen).toBe(true);
    });

    it('is false when explicitly set to false', () => {
      const payload = new PresentData({ slide: makeSlide(), useGreenScreen: false });
      expect(payload.useGreenScreen).toBe(false);
    });

    it('can be set without a slide (flag-only payload)', () => {
      const payload = new PresentData({ useGreenScreen: true });
      expect(payload.useGreenScreen).toBe(true);
      expect(payload.slide).toBeUndefined();
    });

    it('co-exists with a message payload', () => {
      const payload = new PresentData({ message: 'Intermission', useGreenScreen: false });
      expect(payload.message).toBe('Intermission');
      expect(payload.useGreenScreen).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Combined payloads
  // -------------------------------------------------------------------------
  describe('combined payloads', () => {
    it('slide send with useGreenScreen: true carries both fields', () => {
      const slide = makeSlide({ type: SlideType.TITLE, title: 'Keynote' });
      const payload = new PresentData({ slide, useGreenScreen: true });
      expect(payload.slide?.title).toBe('Keynote');
      expect(payload.useGreenScreen).toBe(true);
      expect(payload.message).toBeNull();
      expect(payload.data).toBeNull();
    });

    it('slide send with message carries both slide and message', () => {
      const slide = makeSlide({ title: 'Intro' });
      const payload = new PresentData({ slide, message: 'Welcome everyone' });
      expect(payload.slide?.title).toBe('Intro');
      expect(payload.message).toBe('Welcome everyone');
    });
  });
});

// ===========================================================================
// Part B: Presentation receiver -- handles each broadcast variant correctly
// ===========================================================================

describe('Presentation receiver -- broadcast contract', () => {
  // -------------------------------------------------------------------------
  // Variant 1: slide-only send renders slide in presenter
  // -------------------------------------------------------------------------
  it('renders slide title when a slide-only payload is received', async () => {
    await act(async () => {
      render(<Presentation />);
    });

    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ slide: makeSlide({ title: 'Live Title' }) }));
    });

    expect(screen.getByText('Live Title')).toBeInTheDocument();
  });

  it('does not show a message when slide-only payload has no message', async () => {
    await act(async () => {
      render(<Presentation />);
    });

    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ slide: makeSlide({ title: 'No Message Slide' }) }));
    });

    // The #message div should be empty (no text content)
    const msgDiv = document.getElementById('message');
    expect(msgDiv?.textContent).toBeFalsy();
  });

  // -------------------------------------------------------------------------
  // Variant 2: message-only send appears in #message without clearing slide
  // -------------------------------------------------------------------------
  it('displays message text when a message-only payload is received', async () => {
    await act(async () => {
      render(<Presentation />);
    });

    // First send a slide so there is existing slide state
    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ slide: makeSlide({ title: 'Existing Slide' }) }));
    });

    // Then send message only
    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ message: 'Operator announcement' }));
    });

    expect(screen.getByText('Operator announcement')).toBeInTheDocument();
    // Slide should still be rendered
    expect(screen.getByText('Existing Slide')).toBeInTheDocument();
  });

  it('clears message when empty-string message payload is received', async () => {
    await act(async () => {
      render(<Presentation />);
    });

    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ message: 'Temporary message' }));
    });

    expect(screen.getByText('Temporary message')).toBeInTheDocument();

    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ message: '' }));
    });

    expect(screen.queryByText('Temporary message')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Variant 3: lyrics-navigation does not replace slide or message
  // -------------------------------------------------------------------------
  it('advances lyrics segment on "next" without replacing the song slide', async () => {
    await act(async () => {
      render(<Presentation />);
    });

    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(
        new PresentData({
          slide: makeSongSlide(),
          message: 'Sing along',
          useGreenScreen: false,
        }),
      );
    });

    // Initial segment: first two lines
    expect(screen.getByText('Verse1 Line1')).toBeInTheDocument();
    expect(screen.getByText('Verse1 Line2')).toBeInTheDocument();

    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ data: { lyricsNavigation: { command: 'next' } } }));
    });

    // Segment should advance; message and slide title must still be present
    expect(screen.getByText('Verse1 Line3')).toBeInTheDocument();
    expect(screen.getByText('Verse1 Line4')).toBeInTheDocument();
    expect(screen.getByText('Sing along')).toBeInTheDocument();
  });

  it('rewinds lyrics segment on "previous"', async () => {
    await act(async () => {
      render(<Presentation />);
    });

    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ slide: makeSongSlide(), useGreenScreen: false }));
    });

    // Advance once
    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ data: { lyricsNavigation: { command: 'next' } } }));
    });

    expect(screen.getByText('Verse1 Line3')).toBeInTheDocument();

    // Rewind
    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ data: { lyricsNavigation: { command: 'previous' } } }));
    });

    expect(screen.getByText('Verse1 Line1')).toBeInTheDocument();
    expect(screen.getByText('Verse1 Line2')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Variant 4: useGreenScreen true sets body background to chroma green
  // -------------------------------------------------------------------------
  it('sets body background to chroma green when useGreenScreen is true', async () => {
    await act(async () => {
      render(<Presentation />);
    });

    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ slide: makeSlide(), useGreenScreen: true }));
    });

    expect(document.body.style.backgroundColor).toBe('rgb(0, 177, 64)');
  });

  it('clears chroma green when useGreenScreen is false', async () => {
    await act(async () => {
      render(<Presentation />);
    });

    // Enable green screen first
    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ slide: makeSlide(), useGreenScreen: true }));
    });

    expect(document.body.style.backgroundColor).toBe('rgb(0, 177, 64)');

    // Disable it
    await act(async () => {
      const ch = new (global as any).BroadcastChannel('presentation');
      ch.postMessage(new PresentData({ slide: makeSlide(), useGreenScreen: false }));
    });

    expect(document.body.style.backgroundColor).not.toBe('rgb(0, 177, 64)');
  });
});
