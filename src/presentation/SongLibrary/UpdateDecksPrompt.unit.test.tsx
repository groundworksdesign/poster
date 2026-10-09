import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import UpdateDecksPrompt from './UpdateDecksPrompt';

const DECKS = [
  { id: 'd1', title: 'Sunday', linkedSlideCount: 1, handEditedSlideCount: 0, outOfDateSlideCount: 0 },
  { id: 'd2', title: 'Wed', linkedSlideCount: 2, handEditedSlideCount: 1, outOfDateSlideCount: 0 },
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

  it('labels hand-edited slides as edited by hand', () => {
    render(
      <UpdateDecksPrompt
        mode="edit"
        songTitle="Grace"
        decks={[
          {
            id: 'd1',
            title: 'Sunday',
            linkedSlideCount: 1,
            handEditedSlideCount: 1,
            outOfDateSlideCount: 0,
          },
        ]}
        onConfirm={jest.fn()}
        onSkip={jest.fn()}
      />,
    );
    expect(screen.getByTestId('update-decks-status-d1')).toHaveTextContent('edited by hand');
    expect(screen.getByTestId('update-decks-status-d1')).not.toHaveTextContent(
      'Not updated to the latest library version',
    );
  });

  it('labels out-of-date slides (skipped prior update) without calling them hand-edited', () => {
    render(
      <UpdateDecksPrompt
        mode="edit"
        songTitle="Grace"
        decks={[
          {
            id: 'd1',
            title: 'Sunday',
            linkedSlideCount: 1,
            handEditedSlideCount: 0,
            outOfDateSlideCount: 1,
          },
        ]}
        onConfirm={jest.fn()}
        onSkip={jest.fn()}
      />,
    );
    expect(screen.getByTestId('update-decks-status-d1')).toHaveTextContent(
      'Not updated to the latest library version',
    );
    expect(screen.getByTestId('update-decks-status-d1')).not.toHaveTextContent('edited by hand');
  });

  it('when both hand-edited and out-of-date counts exist, shows edited by hand', () => {
    render(
      <UpdateDecksPrompt
        mode="delete"
        songTitle="Grace"
        decks={[
          {
            id: 'd1',
            title: 'Sunday',
            linkedSlideCount: 2,
            handEditedSlideCount: 1,
            outOfDateSlideCount: 1,
          },
        ]}
        onConfirm={jest.fn()}
        onSkip={jest.fn()}
      />,
    );
    const status = screen.getByTestId('update-decks-status-d1');
    expect(status).toHaveTextContent('edited by hand');
    expect(status).toHaveTextContent('Not updated to the latest library version');
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

  it('asks before overwriting out-of-date slides too', () => {
    const onConfirm = jest.fn();
    render(
      <UpdateDecksPrompt
        mode="edit"
        songTitle="Grace"
        decks={[
          {
            id: 'd1',
            title: 'Sunday',
            linkedSlideCount: 1,
            handEditedSlideCount: 0,
            outOfDateSlideCount: 1,
          },
        ]}
        onConfirm={onConfirm}
        onSkip={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('update-decks-check-d1'));
    fireEvent.click(screen.getByTestId('update-decks-apply'));
    expect(screen.getByTestId('update-decks-hand-edit-prompt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('update-decks-overwrite-yes'));
    expect(onConfirm).toHaveBeenCalledWith(['d1'], true);
  });

  it('applies without confirm prompt when selection has none protected', () => {
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
