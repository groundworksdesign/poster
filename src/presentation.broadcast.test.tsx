import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import Presentation from './Present/Present';
import { SlideType } from './Present/PresentTypes';
import {
  ensureTestSessionBackend,
  resetTestSessionHub,
  setPresentationSearch,
  setupDeckPresentPair,
} from './Present/testSessionHelpers';

beforeEach(() => {
  ensureTestSessionBackend();
  resetTestSessionHub();
});

test('lyricsNavigation partial updates do not clear song slide or message', async () => {
  const { deck, sessionId, presentId } = await setupDeckPresentPair();
  setPresentationSearch(sessionId, presentId);

  await act(async () => {
    render(<Presentation />);
  });

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

  await act(async () => {
    const songSlide = {
      type: SlideType.SONG,
      title: 'Test Song',
      style: { backgroundColor: '#000', color: '#fff' },
      lyrics: { title: 'Test Song', verses: [{ number: 1, lines: ['Line1', 'Line2', 'Line3', 'Line4'] }] },
    } as any;
    await deck.send({ slide: songSlide, message: 'Now playing', useGreenScreen: false });
  });

  expect(screen.getByText('Now playing')).toBeInTheDocument();
  expect(screen.getByText('Line1')).toBeInTheDocument();
  expect(screen.getByText('Line2')).toBeInTheDocument();

  await act(async () => {
    await deck.send({ data: { lyricsNavigation: { command: 'next' } } });
  });

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
