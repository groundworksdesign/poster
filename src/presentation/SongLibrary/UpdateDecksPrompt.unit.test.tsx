import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import UpdateDecksPrompt from './UpdateDecksPrompt';

const DECKS = [
  { id: 'd1', title: 'Sunday', linkedSlideCount: 1, handEditedSlideCount: 0 },
  { id: 'd2', title: 'Wed', linkedSlideCount: 2, handEditedSlideCount: 1 },
];

describe('UpdateDecksPrompt (REQ-012, 016, 023)', () => {
  it('lists decks with checkboxes and skips when none selected', () => {
    const onConfirm = jest.fn();
    const onSkip = jest.fn();
    render(
      <UpdateDecksPrompt
        mode="edit"
        songTitle="Grace"
        decks={DECKS}
        onConfirm={onConfirm}
        onSkip={onSkip}
      />,
    );
    expect(screen.getByTestId('update-decks-prompt')).toBeInTheDocument();
    expect(screen.getByTestId('update-decks-check-d1')).not.toBeChecked();
    fireEvent.click(screen.getByTestId('update-decks-apply'));
    expect(onSkip).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('REQ-016: asks before overwriting hand-edited slides', () => {
    const onConfirm = jest.fn();
    render(
      <UpdateDecksPrompt
        mode="edit"
        songTitle="Grace"
        decks={DECKS}
        onConfirm={onConfirm}
        onSkip={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('update-decks-check-d2'));
    fireEvent.click(screen.getByTestId('update-decks-apply'));
    expect(screen.getByTestId('update-decks-hand-edit-prompt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('update-decks-overwrite-no'));
    expect(onConfirm).toHaveBeenCalledWith(['d2'], false);
  });

  it('applies without hand-edit prompt when selection has none', () => {
    const onConfirm = jest.fn();
    render(
      <UpdateDecksPrompt
        mode="delete"
        songTitle="Grace"
        decks={DECKS}
        onConfirm={onConfirm}
        onSkip={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('update-decks-check-d1'));
    fireEvent.click(screen.getByTestId('update-decks-apply'));
    expect(onConfirm).toHaveBeenCalledWith(['d1'], false);
    expect(screen.queryByTestId('update-decks-hand-edit-prompt')).not.toBeInTheDocument();
  });
});
