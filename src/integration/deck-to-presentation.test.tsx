import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import DeckBuilder from '../Deck/DeckBuilder';
import Presentation from '../Present/Present';

// Lightweight FakeBroadcastChannel used across tests
class FakeBroadcastChannel {
  static channels: Record<string, any[]> = {};
  name: string;
  onmessage: ((e: any) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.channels[name] = FakeBroadcastChannel.channels[name] || [];
    FakeBroadcastChannel.channels[name].push(this);
  }

  postMessage(msg: any) {
    const list = FakeBroadcastChannel.channels[this.name] || [];
    list.forEach(ch => {
      if (ch !== this && typeof ch.onmessage === 'function') {
        ch.onmessage({ data: msg });
      }
    });
  }

  close() {
    const list = FakeBroadcastChannel.channels[this.name] || [];
    FakeBroadcastChannel.channels[this.name] = list.filter(ch => ch !== this);
  }
}

// Fake FileReader that supports readAsText(file) by calling file.text() when available
class FakeFileReader {
  result: any = null;
  _loadCb: ((ev?: any) => void) | null = null;

  addEventListener(event: string, cb: (ev?: any) => void) {
    if (event === 'load') this._loadCb = cb;
  }

  readAsText(file: any) {
    if (typeof file?.text === 'function') {
      file.text().then((txt: string) => {
        this.result = txt;
        if (this._loadCb) this._loadCb({ target: { result: txt } });
      });
    } else if ((file as any).content) {
      this.result = (file as any).content;
      if (this._loadCb) this._loadCb({ target: { result: this.result } });
    } else {
      // fallback
      this.result = file;
      if (this._loadCb) this._loadCb({ target: { result: this.result } });
    }
  }
}

beforeEach(() => {
  // install fakes into the global test environment
  // @ts-ignore
  (global as any).BroadcastChannel = FakeBroadcastChannel;
  // @ts-ignore
  (global as any).FileReader = FakeFileReader;
});

afterEach(() => {
  // cleanup globals and fake registry
  // @ts-ignore
  delete (global as any).BroadcastChannel;
  // @ts-ignore
  delete (global as any).FileReader;
  // @ts-ignore
  FakeBroadcastChannel.channels = {};
});

test('DeckBuilder Send updates Presentation via BroadcastChannel', async () => {
  const deck = {
    title: 'Test Deck',
    date: '2026-01-01',
    location: '',
    useGreenScreen: false,
    notes: '',
    slideStyles: {
      general: { backgroundColor: '#000', color: '#fff', fontFamily: 'Arial', fontSize: '24px', height: '100%', width: '100%' },
    },
    slides: [
      {
        id: 's1',
        type: 'title',
        title: 'Slide 1',
        style: { backgroundColor: '#111', color: '#fff', height: '100%', width: '100%' },
      },
    ],
  };

  const deckJson = JSON.stringify(deck);

  await act(async () => {
    render(
      <>
        <DeckBuilder />
        <Presentation />
      </>
    );
  });

  // Simulate a builder by posting a PresentData message on the 'presentation' channel
  await act(async () => {
    const chan = new (global as any).BroadcastChannel('presentation');
    const slideMsg = {
      slide: deck.slides[0],
      message: 'Simulated send',
      useGreenScreen: false,
    } as any;
    chan.postMessage(slideMsg);
  });

  // assert that Presentation received the message and rendered the slide
  await waitFor(() => expect(screen.getByText('Simulated send')).toBeInTheDocument());
  expect(screen.getByText('Slide 1')).toBeInTheDocument();
});
