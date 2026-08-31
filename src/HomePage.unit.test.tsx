import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

import HomePage from './HomePage';

test('deck builder link opens a new window without same-tab navigation', () => {
  const openSpy = jest.spyOn(window, 'open').mockReturnValue({ focus: jest.fn(), opener: null } as any);
  render(<HomePage />);
  const link = screen.getByRole('link', { name: /open deck builder/i });
  expect(link).not.toHaveAttribute('target', '_blank');
  fireEvent.click(link);
  expect(openSpy).toHaveBeenCalledWith(
    expect.stringContaining('/deck'),
    'posterDeck',
    expect.any(String),
  );
  openSpy.mockRestore();
});

test('presentation link opens a new window without same-tab navigation', () => {
  const openSpy = jest.spyOn(window, 'open').mockReturnValue({ focus: jest.fn(), opener: null } as any);
  render(<HomePage />);
  const link = screen.getByRole('link', { name: /open presentation/i });
  fireEvent.click(link);
  expect(openSpy).toHaveBeenCalledWith(
    expect.stringContaining('/presentation'),
    'posterPresentation',
    expect.any(String),
  );
  openSpy.mockRestore();
});
