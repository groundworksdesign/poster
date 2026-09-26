import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react';
import Presentation from './Present';

type PosterFs = {
  toggleFullscreen: jest.Mock;
  exitFullscreen: jest.Mock;
  enterFullscreen?: jest.Mock;
  isFullscreen?: jest.Mock;
};

function installPosterBridge(fs: PosterFs) {
  (window as Window & { poster?: unknown }).poster = {
    deckCommand: jest.fn(),
    presentEvent: jest.fn(),
    onDeckEvent: () => () => {},
    onPresentPush: () => () => {},
    pickLibraryFolder: jest.fn(),
    ...fs,
  };
}

beforeEach(() => {
  delete (window as Window & { poster?: unknown }).poster;
  window.history.replaceState({}, '', '/presentation');
  document.exitFullscreen = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => null,
  });
  document.documentElement.requestFullscreen = jest.fn().mockResolvedValue(undefined);
});

afterEach(() => {
  delete (window as Window & { poster?: unknown }).poster;
});

test('Electron Present F uses poster.toggleFullscreen and never requestFullscreen', async () => {
  const toggleFullscreen = jest.fn().mockResolvedValue({
    ok: true,
    mode: 'native',
    fallback: false,
  });
  const exitFullscreen = jest.fn().mockResolvedValue({
    ok: true,
    mode: 'windowed',
    fallback: false,
  });
  installPosterBridge({ toggleFullscreen, exitFullscreen });

  render(<Presentation />);
  await waitFor(() => {
    expect(screen.getByText(/Open Present from the deck builder/i)).toBeInTheDocument();
  });

  await act(async () => {
    fireEvent.keyDown(window, { key: 'f' });
  });

  expect(toggleFullscreen).toHaveBeenCalledTimes(1);
  expect(document.documentElement.requestFullscreen).not.toHaveBeenCalled();
});

test('Electron Escape exits via poster.exitFullscreen and clears fallback in mock', async () => {
  const toggleFullscreen = jest.fn();
  const exitFullscreen = jest.fn().mockResolvedValue({
    ok: true,
    mode: 'windowed',
    fallback: false,
  });
  installPosterBridge({ toggleFullscreen, exitFullscreen });

  render(<Presentation />);
  await waitFor(() => {
    expect(screen.getByText(/Open Present from the deck builder/i)).toBeInTheDocument();
  });

  await act(async () => {
    fireEvent.keyDown(window, { key: 'Escape' });
  });

  expect(exitFullscreen).toHaveBeenCalledTimes(1);
  expect(document.documentElement.requestFullscreen).not.toHaveBeenCalled();
});

test('Browser Present F still uses HTML requestFullscreen', async () => {
  render(<Presentation />);
  await waitFor(() => {
    expect(screen.getByText(/Open Present from the deck builder/i)).toBeInTheDocument();
  });

  await act(async () => {
    fireEvent.keyDown(window, { key: 'F' });
  });

  expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
});

test('Browser Present Escape uses document.exitFullscreen when active', async () => {
  const fsEl = document.documentElement;
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fsEl,
  });

  render(<Presentation />);
  await waitFor(() => {
    expect(screen.getByText(/Open Present from the deck builder/i)).toBeInTheDocument();
  });

  await act(async () => {
    fireEvent.keyDown(window, { key: 'Escape' });
  });

  expect(document.exitFullscreen).toHaveBeenCalled();
});
