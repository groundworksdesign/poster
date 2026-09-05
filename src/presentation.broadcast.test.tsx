import React from 'react';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import Presentation from './Present/Present';
import { SlideType } from './Present/PresentTypes';

// A lightweight FakeBroadcastChannel for tests that routes messages between instances
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

beforeEach(() => {
  // @ts-ignore - install fake BroadcastChannel into global test env
  (global as any).BroadcastChannel = FakeBroadcastChannel;
});

afterEach(() => {
  // @ts-ignore
  delete (global as any).BroadcastChannel;
  // reset channel registry
  // @ts-ignore
  FakeBroadcastChannel.channels = {};
});

test('lyricsNavigation partial updates do not clear song slide or message', async () => {
  await act(async () => {
    render(<Presentation />);
  });

  // send full song slide from a builder instance
  await act(async () => {
    const songSlide = {
      type: SlideType.SONG,
      title: 'Test Song',
      style: { backgroundColor: '#000', color: '#fff' },
      lyrics: { title: 'Test Song', verses: [{ number: 1, lines: ['Line1', 'Line2', 'Line3', 'Line4'] }] },
    } as any;

    const chan = new (global as any).BroadcastChannel('presentation');
    chan.postMessage({ slide: songSlide, message: 'Now playing', useGreenScreen: false });
  });

  // initial lines should be visible
  expect(screen.getByText('Now playing')).toBeInTheDocument();
  expect(screen.getByText('Line1')).toBeInTheDocument();
  expect(screen.getByText('Line2')).toBeInTheDocument();

  // send partial lyricsNavigation update (next)
  await act(async () => {
    const chan = new (global as any).BroadcastChannel('presentation');
    chan.postMessage({ data: { lyricsNavigation: { command: 'next' } } });
  });

  // message and slide should still be present, and lyrics should advance to next 2 lines
  expect(screen.getByText('Now playing')).toBeInTheDocument();
  expect(screen.getByText('Line3')).toBeInTheDocument();
  expect(screen.getByText('Line4')).toBeInTheDocument();
});

test('explicit null slide clears presentation output', async () => {
  await act(async () => {
    render(<Presentation />);
  });

  await act(async () => {
    const chan = new (global as any).BroadcastChannel('presentation');
    chan.postMessage({
      slide: {
        type: SlideType.TITLE,
        title: 'Visible Title',
        style: { backgroundColor: '#000', color: '#fff' },
      },
      useGreenScreen: false,
    });
  });

  expect(screen.getByText('Visible Title')).toBeInTheDocument();

  await act(async () => {
    const chan = new (global as any).BroadcastChannel('presentation');
    chan.postMessage({ slide: null, useGreenScreen: false });
  });

  expect(screen.queryByText('Visible Title')).not.toBeInTheDocument();
});
