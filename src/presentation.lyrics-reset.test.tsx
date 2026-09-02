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

test('segmentIndex resets to 0 when a new song slide is received', async () => {
  const { deck, sessionId, presentId } = await setupDeckPresentPair();
  setPresentationSearch(sessionId, presentId);

  await act(async () => {
    render(<Presentation />);
  });

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

  await act(async () => {
    const songSlide = {
      type: SlideType.SONG,
      title: 'First Song',
      style: { backgroundColor: '#000', color: '#fff' },
      lyrics: { title: 'First Song', verses: [{ number: 1, lines: ['A1', 'A2', 'A3', 'A4'] }] },
    } as any;
    await deck.send({ slide: songSlide, message: 'Playing first', useGreenScreen: false });
  });

  await act(async () => {
    await deck.send({ data: { lyricsNavigation: { command: 'next' } } });
  });

  expect(screen.getByText('A3')).toBeInTheDocument();
  expect(screen.getByText('A4')).toBeInTheDocument();

  await act(async () => {
    const songSlide2 = {
      type: SlideType.SONG,
      title: 'Second Song',
      style: { backgroundColor: '#000', color: '#fff' },
      lyrics: { title: 'Second Song', verses: [{ number: 1, lines: ['B1', 'B2', 'B3', 'B4'] }] },
    } as any;
    await deck.send({ slide: songSlide2, message: 'Playing second', useGreenScreen: false });
  });

  expect(screen.getByText('B1')).toBeInTheDocument();
  expect(screen.getByText('B2')).toBeInTheDocument();
  expect(screen.queryByText('A3')).not.toBeInTheDocument();
});
