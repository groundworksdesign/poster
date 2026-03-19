import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SlideDisplay from './SlideDisplay';

test('SlideDisplay sends action with slide and green screen flag', () => {
  const sendAction = jest.fn();
  const deck = { useGreenScreen: true, slideStyles: { '0': {} } } as any;
  const slide = { title: 'Test Slide', subTitle: 'Sub', type: 0 } as any;

  render(<SlideDisplay deck={deck} slide={slide} sendAction={sendAction} />);

  expect(screen.getByText('Test Slide')).toBeInTheDocument();

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
  });

  expect(sendAction).toHaveBeenCalledTimes(1);
  expect(sendAction).toHaveBeenCalledWith(expect.objectContaining({
    slide: expect.objectContaining({ title: 'Test Slide' }),
    useGreenScreen: true,
  }));
});
