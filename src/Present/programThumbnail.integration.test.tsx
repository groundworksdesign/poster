import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import Presentation from './Present';
import { ProgramThumbnailPanel } from '../Deck/ProgramThumbnailPanel';
import {
  ensureTestSessionBackend,
  resetTestSessionHub,
  setPresentationSearch,
  setupDeckPresentPair,
} from './testSessionHelpers';
import { SlideType } from './PresentTypes';

beforeEach(() => {
  ensureTestSessionBackend();
  resetTestSessionHub();
});

test('Present reports program-state and owning deck receives program-thumbnail', async () => {
  const { deck, sessionId, presentId } = await setupDeckPresentPair();

  const events: unknown[] = [];
  deck.onDeckEvent((event) => {
    events.push(event);
  });

  setPresentationSearch(sessionId, presentId);

  await act(async () => {
    render(<Presentation />);
  });

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

  await act(async () => {
    await deck.send({
      slide: {
        id: 's1',
        type: SlideType.TITLE,
        title: 'Program Title',
        style: { backgroundColor: '#222', color: '#fff', height: '100%', width: '100%' },
      },
      useGreenScreen: false,
    });
  });

  await waitFor(() => expect(screen.getByText('Program Title')).toBeInTheDocument());

  await waitFor(() => {
    const thumb = events.find(
      (e: any) => e.type === 'program-thumbnail' && e.program?.title === 'Program Title',
    );
    expect(thumb).toBeTruthy();
    expect((thumb as any).presentId).toBe(presentId);
  });
});

test('ProgramThumbnailPanel shows empty and populated states', () => {
  const { rerender } = render(<ProgramThumbnailPanel program={null} />);
  expect(screen.getByTestId('program-thumbnail-empty')).toBeInTheDocument();

  rerender(
    <ProgramThumbnailPanel
      program={{
        title: 'Welcome',
        subTitle: 'Live',
        backgroundColor: '#111',
        color: '#fff',
        slideType: 'title',
        useGreenScreen: false,
      }}
    />,
  );
  expect(screen.getByTestId('program-thumbnail-title')).toHaveTextContent('Welcome');
  expect(screen.getByTestId('program-thumbnail-subtitle')).toHaveTextContent('Live');
});
