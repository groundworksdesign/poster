import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Presentation from './Present';
import { applyTheme, THEME_STORAGE_KEY } from '../utils/useTheme';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

test('Present applies persisted theme from localStorage on mount', async () => {
  applyTheme('tokyo-night');
  delete document.documentElement.dataset.theme;

  window.history.replaceState({}, '', '/presentation');
  render(<Presentation />);

  await waitFor(() => {
    expect(document.documentElement.dataset.theme).toBe('tokyo-night');
  });
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('tokyo-night');
  expect(screen.getByText(/Open Present from the deck builder/i)).toBeInTheDocument();
});
