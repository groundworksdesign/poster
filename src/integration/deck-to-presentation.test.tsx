import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import Presentation from '../Present/Present';
import {
  ensureTestSessionBackend,
  resetTestSessionHub,
  setPresentationSearch,
  setupDeckPresentPair,
} from '../Present/testSessionHelpers';

beforeEach(() => {
  ensureTestSessionBackend();
  resetTestSessionHub();
});

test('DeckBuilder Send updates Presentation via session transport', async () => {
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

  const { deck: deckSession, sessionId, presentId } = await setupDeckPresentPair();
  setPresentationSearch(sessionId, presentId);

  await act(async () => {
    render(<Presentation />);
  });

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

  await act(async () => {
    await deckSession.send({
      slide: deck.slides[0],
      message: 'Simulated send',
      useGreenScreen: false,
    });
  });

  await waitFor(() => expect(screen.getByText('Simulated send')).toBeInTheDocument());
  expect(screen.getByText('Slide 1')).toBeInTheDocument();
});
