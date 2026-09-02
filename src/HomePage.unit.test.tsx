import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from './HomePage';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('Home lists Open Presentation targeting /deck (not bare /presentation)', () => {
  render(<HomePage />);
  const openPresentation = screen.getByTestId('open-presentation');
  expect(openPresentation).toHaveAttribute('href', '/deck');
  expect(openPresentation).toHaveTextContent(/Open Presentation/i);
  expect(screen.queryByRole('link', { name: /open presentation \(new window\)/i })).not.toBeInTheDocument();
  const barePresent = screen.queryAllByRole('link').filter((a) => {
    const href = a.getAttribute('href') || '';
    return href === '/presentation' || href.startsWith('/presentation?') && !href.includes('sessionId');
  });
  expect(barePresent).toHaveLength(0);
});

test('Open Presentation opens a deck window and leaves Home put', () => {
  const openSpy = jest.spyOn(window, 'open').mockReturnValue({
    opener: null,
    focus: jest.fn(),
  } as unknown as Window);

  render(<HomePage />);
  expect(screen.getByRole('heading', { level: 1, name: 'Poster' })).toBeInTheDocument();

  fireEvent.click(screen.getByTestId('open-presentation'));

  expect(openSpy).toHaveBeenCalled();
  const [url] = openSpy.mock.calls[0];
  expect(String(url)).toContain('/deck');
  expect(String(url)).not.toMatch(/\/presentation/);
  // Home heading still mounted (same document; popup is separate)
  expect(screen.getByRole('heading', { level: 1, name: 'Poster' })).toBeInTheDocument();
  expect(screen.getByText(/library of saved presentations/i)).toBeInTheDocument();
});
