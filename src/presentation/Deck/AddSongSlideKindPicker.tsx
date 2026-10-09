import React from 'react';

type Props = {
  onScratch: () => void;
  onLinked: () => void;
  onCancel: () => void;
};

/**
 * First step when Add slide > SONG: choose scratch (blank, unlinked) or linked (chooser).
 */
export default function AddSongSlideKindPicker({ onScratch, onLinked, onCancel }: Props) {
  return (
    <section className="add-song-kind-picker" data-testid="add-song-kind-picker">
      <h2>Add song slide</h2>
      <p>Choose a blank song you edit here, or a song linked to the library.</p>
      <div className="add-song-kind-actions">
        <button type="button" data-testid="add-song-kind-scratch" onClick={onScratch}>
          Song from scratch
        </button>
        <button type="button" data-testid="add-song-kind-linked" onClick={onLinked}>
          Linked song
        </button>
      </div>
      <button type="button" data-testid="add-song-kind-cancel" onClick={onCancel}>
        Cancel
      </button>
    </section>
  );
}
