import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Broadcast connection used by DeckBuilder to avoid BroadcastChannel in the test environment
jest.mock('../Present/Broadcast', () => ({
  connect: (channelType: any, handler: any) => ({
    id: 'mock-id',
    channel: { postMessage: jest.fn(), onmessage: null },
    channelType,
  }),
  ChannelType: { BUILDER: 0, PRESENTER: 1 },
}));

import DeckBuilder from './DeckBuilder';

test('DeckBuilder shows header and handles save with no deck', () => {
  render(<DeckBuilder />);

  // header
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Deck');

  // no deck message
  expect(screen.getByText('No deck loaded yet.')).toBeInTheDocument();

  // click save and assert message
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
  });

  expect(screen.getByText('No deck to save')).toBeInTheDocument();
});
