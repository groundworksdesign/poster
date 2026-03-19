import React from 'react';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import Presentation from './Present/Present';
import { SlideType } from './Present/PresentTypes';

// FakeBroadcastChannel (copied from existing tests)
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
  // @ts-ignore
  (global as any).BroadcastChannel = FakeBroadcastChannel;
});

afterEach(() => {
  // @ts-ignore
  delete (global as any).BroadcastChannel;
  // @ts-ignore
  FakeBroadcastChannel.channels = {};
});

test('segmentIndex resets to 0 when a new song slide is received', async () => {
  await act(async () => {
    render(<Presentation />);
  });

  // send first song slide
  await act(async () => {
    const songSlide = {
      type: SlideType.SONG,
      title: 'First Song',
      style: { backgroundColor: '#000', color: '#fff' },
      lyrics: { title: 'First Song', verses: [{ number: 1, lines: ['A1', 'A2', 'A3', 'A4'] }] },
    } as any;

    const chan = new (global as any).BroadcastChannel('presentation');
    chan.postMessage({ slide: songSlide, message: 'Playing first', useGreenScreen: false });
  });

  // advance to next segment (now shows A3/A4)
  await act(async () => {
    const chan = new (global as any).BroadcastChannel('presentation');
    chan.postMessage({ data: { lyricsNavigation: { command: 'next' } } });
  });

  expect(screen.getByText('A3')).toBeInTheDocument();
  expect(screen.getByText('A4')).toBeInTheDocument();

  // Now send a NEW song slide — expect lyrics to reset to first segment (B1/B2)
  await act(async () => {
    const songSlide2 = {
      type: SlideType.SONG,
      title: 'Second Song',
      style: { backgroundColor: '#000', color: '#fff' },
      lyrics: { title: 'Second Song', verses: [{ number: 1, lines: ['B1', 'B2', 'B3', 'B4'] }] },
    } as any;

    const chan = new (global as any).BroadcastChannel('presentation');
    chan.postMessage({ slide: songSlide2, message: 'Playing second', useGreenScreen: false });
  });

  // Should show the new song's first two lines
  expect(screen.getByText('B1')).toBeInTheDocument();
  expect(screen.getByText('B2')).toBeInTheDocument();
  // previous song's later lines should no longer be present
  expect(screen.queryByText('A3')).not.toBeInTheDocument();
});
