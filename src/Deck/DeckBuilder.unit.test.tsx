import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeckBuilder from './DeckBuilder';

test('DeckBuilder shows header and handles save with no deck', () => {
  render(<DeckBuilder />);

  // header
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Deck');

  // no deck message
  expect(screen.getByText('No deck loaded yet.')).toBeInTheDocument();

  // click save and assert message
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
  });

  expect(screen.getByText('No deck to save')).toBeInTheDocument();
});
