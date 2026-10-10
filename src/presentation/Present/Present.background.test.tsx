import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import Presentation from './Present';
import {
  ensureTestSessionBackend,
  resetTestSessionHub,
  setPresentationSearch,
  setupDeckPresentPair,
} from './testSessionHelpers';
import { SlideType } from '../../domain/PresentTypes';

beforeEach(() => {
  ensureTestSessionBackend();
  resetTestSessionHub();
});

const TINY_PNG = 'data:image/png;base64,deckwhole';
const TINY_TITLE = 'data:image/png;base64,decktitle';
const TINY_PIC = 'data:image/png;base64,picture';

async function mountPresent() {
  const pair = await setupDeckPresentPair();
  setPresentationSearch(pair.sessionId, pair.presentId);
  await act(async () => {
    render(<Presentation />);
  });
  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  return pair;
}

test('AC-001: whole-slide background renders for every slide type', async () => {
  const { deck } = await mountPresent();

  for (const type of [
    SlideType.TITLE,
    SlideType.GENERAL,
    SlideType.IMAGE,
    SlideType.SONG,
    SlideType.AUDIO,
    SlideType.VIDEO,
  ]) {
    await act(async () => {
      await deck.send({
        slide: {
          id: `s-${type}`,
          type,
          title: `T-${type}`,
          file: type === SlideType.IMAGE ? TINY_PIC : undefined,
          lyrics:
            type === SlideType.SONG
              ? { title: 'Song', verses: [{ number: 1, lines: ['line a', 'line b'] }] }
              : undefined,
          style: { backgroundColor: '#111', color: '#fff' },
        },
        defaultBackground: { image: TINY_PNG, fit: 'fill', dim: 0 },
        useGreenScreen: false,
      });
    });
    await waitFor(() => expect(screen.getByTestId('present-whole-bg')).toBeInTheDocument());
    expect(screen.getByTestId('present-whole-bg')).toHaveAttribute('data-fit', 'fill');
  }
});

test('AC-002: title text-layer background is separate from whole-slide', async () => {
  const { deck } = await mountPresent();
  await act(async () => {
    await deck.send({
      slide: {
        id: 'title-1',
        type: SlideType.TITLE,
        title: 'Hello',
        subTitle: 'World',
        style: { color: '#fff' },
      },
      defaultBackground: { image: TINY_PNG, fit: 'tile', dim: 0 },
      defaultTitleTextBackground: { image: TINY_TITLE, fit: 'fit', dim: 0.25 },
      useGreenScreen: false,
    });
  });
  await waitFor(() => expect(screen.getByTestId('present-whole-bg')).toBeInTheDocument());
  expect(screen.getByTestId('present-title-text-bg')).toBeInTheDocument();
  expect(screen.getByTestId('present-title-text-bg')).toHaveAttribute('data-fit', 'fit');
  expect(screen.getByTestId('present-title-text-bg-dim')).toHaveAttribute('data-dim', '0.25');
  expect(screen.getByTestId('present-whole-bg')).toHaveAttribute('data-fit', 'tile');
});

test('AC-004: image slide picture is fitted on top of whole-slide background', async () => {
  const { deck } = await mountPresent();
  await act(async () => {
    await deck.send({
      slide: {
        id: 'img-1',
        type: SlideType.IMAGE,
        title: 'Pic',
        file: TINY_PIC,
        style: {},
      },
      defaultBackground: { image: TINY_PNG, fit: 'fill', dim: 0 },
      useGreenScreen: false,
    });
  });
  await waitFor(() => expect(screen.getByTestId('present-image-picture')).toBeInTheDocument());
  expect(screen.getByTestId('present-whole-bg')).toBeInTheDocument();
  expect(screen.getByTestId('present-image-picture')).toHaveStyle({ backgroundSize: 'contain' });
});

test('AC-005 / AC-006: fit modes and dim overlay render', async () => {
  const { deck } = await mountPresent();
  await act(async () => {
    await deck.send({
      slide: {
        id: 'g1',
        type: SlideType.GENERAL,
        title: 'G',
        style: {},
        background: { image: TINY_PNG, fit: 'fit', dim: 0.5 },
      },
      useGreenScreen: false,
    });
  });
  await waitFor(() => expect(screen.getByTestId('present-whole-bg')).toHaveAttribute('data-fit', 'fit'));
  expect(screen.getByTestId('present-whole-bg-dim')).toHaveAttribute('data-dim', '0.5');
});

test('AC-009: green screen keeps whole-slide and title text-layer images', async () => {
  const { deck } = await mountPresent();
  await act(async () => {
    await deck.send({
      slide: {
        id: 'gs-title',
        type: SlideType.TITLE,
        title: 'GS',
        subTitle: 'Mode',
        style: { backgroundColor: '#222', color: '#fff' },
      },
      defaultBackground: { image: TINY_PNG, fit: 'fill', dim: 0.1 },
      defaultTitleTextBackground: { image: TINY_TITLE, fit: 'fit', dim: 0 },
      useGreenScreen: true,
    });
  });
  await waitFor(() => expect(screen.getByTestId('present-whole-bg')).toBeInTheDocument());
  expect(screen.getByTestId('present-title-text-bg')).toBeInTheDocument();
});

test('AC-010: older deck with only style.backgroundImage keeps legacy look (no new layer)', async () => {
  const { deck } = await mountPresent();
  await act(async () => {
    await deck.send({
      slide: {
        id: 'legacy',
        type: SlideType.GENERAL,
        title: 'Legacy',
        style: { backgroundImage: 'https://example.com/old.jpg', backgroundColor: '#000' },
      },
      useGreenScreen: false,
    });
  });
  await waitFor(() => expect(screen.getByText('Legacy')).toBeInTheDocument());
  expect(screen.queryByTestId('present-whole-bg')).not.toBeInTheDocument();
  const content = document.getElementById('content');
  expect(content).toHaveStyle({ backgroundImage: 'url(https://example.com/old.jpg)' });
});
