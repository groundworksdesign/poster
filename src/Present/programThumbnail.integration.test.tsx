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
import { HorizontalAlign, SlideType, VerticalAlign } from './PresentTypes';

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

test('Present clears its viewport and thumbnail state for a blank payload', async () => {
  const { deck, sessionId, presentId } = await setupDeckPresentPair();
  const events: unknown[] = [];
  deck.onDeckEvent((event) => events.push(event));
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
        title: 'Will clear',
        style: { backgroundColor: '#222', color: '#fff' },
      },
    });
  });

  await waitFor(() => expect(screen.getByText('Will clear')).toBeInTheDocument());

  await act(async () => {
    await deck.send({ slide: null, useGreenScreen: false });
  });

  await waitFor(() => expect(screen.queryByText('Will clear')).not.toBeInTheDocument());
  await waitFor(() => {
    expect(
      events.some(
        (event: any) =>
          event.type === 'program-thumbnail' &&
          event.presentId === presentId &&
          event.program === null,
      ),
    ).toBe(true);
  });
});

test('Present reports the exact program state for navigation, sends, messages, lyrics, and green screen', async () => {
  const { deck, sessionId, presentId } = await setupDeckPresentPair();
  const events: any[] = [];
  deck.onDeckEvent((event) => {
    if (event.type === 'program-thumbnail' && event.presentId === presentId) events.push(event);
  });
  setPresentationSearch(sessionId, presentId);

  await act(async () => {
    render(<Presentation />);
  });
  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

  const titleSlide = {
    id: 'start',
    type: SlideType.TITLE,
    title: 'Start',
    subTitle: 'Small',
    titleFontSize: '48px',
    subTitleFontSize: '24px',
    style: {
      backgroundColor: '#123456',
      color: '#fff',
      verticalAlign: 'bottom',
      fontWeight: 'bold',
    },
  };
  const nextSlide = {
    id: 'next',
    type: SlideType.GENERAL,
    title: 'Next',
    style: { backgroundColor: '#654321', color: '#fff' },
  };

  const sendAndGet = async (payload: unknown) => {
    const previousCount = events.length;
    await act(async () => {
      await deck.send(payload);
    });
    await waitFor(() => expect(events.length).toBeGreaterThan(previousCount));
    return events[events.length - 1].program;
  };

  expect((await sendAndGet({ slide: titleSlide, useGreenScreen: false })).title).toBe('Start');
  expect((await sendAndGet({ slide: nextSlide, useGreenScreen: false })).title).toBe('Next');
  expect((await sendAndGet({ slide: titleSlide, useGreenScreen: false })).title).toBe('Start');
  expect((await sendAndGet({ slide: nextSlide, useGreenScreen: false })).title).toBe('Next');

  const message = await sendAndGet({ message: 'Live message', useGreenScreen: false });
  expect(message).toMatchObject({ message: 'Live message', title: 'Next' });

  const song = {
    id: 'song',
    type: SlideType.SONG,
    title: 'Song',
    style: { backgroundColor: '#000', color: '#fff', fontSize: '30px' },
    lyrics: {
      title: 'Song',
      verses: [{ number: 1, lines: ['One', 'Two', 'Three', 'Four'] }],
    },
  };
  expect((await sendAndGet({ slide: song, useGreenScreen: true })).lines).toEqual(['One', 'Two']);
  expect((await sendAndGet({ data: { lyricsNavigation: { command: 'next' } } })).lines).toEqual([
    'Three',
    'Four',
  ]);
  expect((await sendAndGet({ data: { lyricsNavigation: { command: 'previous' } } })).lines).toEqual([
    'One',
    'Two',
  ]);
  expect(
    (await sendAndGet({ data: { lyricsNavigation: { command: 'goToVerse', verseIndex: 1 } } })).lines,
  ).toEqual(['Three', 'Four']);

  const green = events[events.length - 1].program;
  expect(green).toMatchObject({ useGreenScreen: true, backgroundColor: 'transparent' });
  expect(await sendAndGet({ slide: null, useGreenScreen: true })).toBeNull();
  expect(screen.queryByText('Three')).not.toBeInTheDocument();
});

test('ProgramThumbnailPanel shows empty and populated states', () => {
  const { rerender } = render(<ProgramThumbnailPanel program={null} />);
  expect(screen.getByTestId('program-thumbnail-empty')).toBeInTheDocument();

  rerender(
    <ProgramThumbnailPanel
      program={{
        title: 'Welcome',
        subTitle: 'Live',
        slideStyle: { backgroundColor: '#111', color: '#fff' },
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

test('ProgramThumbnailPanel renders blank output without slide content', () => {
  render(<ProgramThumbnailPanel program={null} />);
  expect(screen.getByTestId('program-thumbnail-empty')).toHaveTextContent('Blank program output.');
  expect(screen.queryByTestId('program-thumbnail-title')).not.toBeInTheDocument();
  expect(screen.queryByTestId('program-thumbnail-lines')).not.toBeInTheDocument();
});

test('ProgramThumbnailPanel matches green-screen output and suppresses image backgrounds', () => {
  render(
    <ProgramThumbnailPanel
      program={{
        title: 'Green-screen slide',
        subTitle: 'No image',
        slideFile: 'https://example.com/slide.jpg',
        slideStyle: { backgroundColor: '#222', color: '#fff', backgroundImage: 'https://example.com/style.jpg' },
        backgroundColor: 'transparent',
        color: '#fff',
        slideType: 'image',
        useGreenScreen: true,
      }}
    />,
  );

  const preview = screen.getByTestId('program-thumbnail-preview');
  expect(preview).toHaveStyle({ backgroundColor: '#00b140' });
  expect(preview).not.toHaveStyle({ backgroundImage: 'url(https://example.com/slide.jpg)' });
  expect(preview).not.toHaveStyle({ backgroundImage: 'url(https://example.com/style.jpg)' });
  expect(screen.getByTestId('program-thumbnail-title')).toHaveTextContent('Green-screen slide');
});

test('ProgramThumbnailPanel preserves Present alignment and typography', () => {
  render(
    <ProgramThumbnailPanel
      program={{
        title: 'Styled',
        subTitle: 'Subtitle',
        titleFontSize: '48px',
        subTitleFontSize: '24px',
        slideStyle: {
          verticalAlign: VerticalAlign.BOTTOM,
          horizontalAlign: HorizontalAlign.RIGHT,
          fontWeight: 'bold',
          color: '#fff',
        },
        useGreenScreen: false,
      }}
    />,
  );

  const preview = screen.getByTestId('program-thumbnail-preview');
  expect(preview).toHaveStyle({ justifyContent: 'flex-end', alignItems: 'flex-end', fontWeight: 'bold' });
  expect(screen.getByTestId('program-thumbnail-title')).toHaveStyle({ fontSize: '48px' });
  expect(screen.getByTestId('program-thumbnail-subtitle')).toHaveStyle({ fontSize: '24px' });
});
