import React, { useEffect, useMemo, useState } from 'react';

export type DeckUsageOption = {
  id: string;
  title: string;
  linkedSlideCount: number;
  handEditedSlideCount: number;
};

type Props = {
  mode: 'edit' | 'delete';
  songTitle: string;
  decks: DeckUsageOption[];
  busy?: boolean;
  onConfirm: (deckIds: string[], overwriteHandEdited: boolean) => void;
  onSkip: () => void;
};

/**
 * REQ-012 / REQ-023: ask about updating decks only when the song is used;
 * list decks with checkboxes. REQ-016: extra confirm for hand-edited slides.
 */
export default function UpdateDecksPrompt({
  mode,
  songTitle,
  decks,
  busy,
  onConfirm,
  onSkip,
}: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const d of decks) init[d.id] = false;
    return init;
  });
  const [phase, setPhase] = useState<'choose' | 'hand-edit'>('choose');

  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const d of decks) init[d.id] = false;
    setSelected(init);
    setPhase('choose');
  }, [decks]);

  const selectedIds = useMemo(
    () => decks.filter(d => selected[d.id]).map(d => d.id),
    [decks, selected],
  );

  const handEditedInSelection = useMemo(
    () =>
      decks
        .filter(d => selected[d.id])
        .reduce((sum, d) => sum + (d.handEditedSlideCount || 0), 0),
    [decks, selected],
  );

  const toggle = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const heading =
    mode === 'edit'
      ? `Update decks that use "${songTitle}"?`
      : `Remove linked slides for "${songTitle}" from decks?`;

  const lead =
    mode === 'edit'
      ? 'The library song was saved. Choose which decks should get the new lyrics. Unchecked decks stay as they are.'
      : 'The song will be deleted from the library. Choose decks where linked slides should be removed. Unchecked decks keep their slides.';

  if (phase === 'hand-edit') {
    return (
      <section
        className="update-decks-prompt"
        data-testid="update-decks-hand-edit-prompt"
        role="dialog"
        aria-labelledby="update-decks-hand-edit-title"
      >
        <h2 id="update-decks-hand-edit-title">Overwrite hand-edited slides?</h2>
        <p>
          {handEditedInSelection} linked slide
          {handEditedInSelection === 1 ? '' : 's'} in the selected deck
          {selectedIds.length === 1 ? '' : 's'} were edited by hand. Overwrite
          {mode === 'delete' ? ' / remove' : ''} them too?
        </p>
        <div className="update-decks-prompt-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(selectedIds, true)}
            data-testid="update-decks-overwrite-yes"
          >
            Yes, include hand-edited
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(selectedIds, false)}
            data-testid="update-decks-overwrite-no"
          >
            No, leave hand-edited alone
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setPhase('choose')}
            data-testid="update-decks-hand-edit-back"
          >
            Back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="update-decks-prompt"
      data-testid="update-decks-prompt"
      role="dialog"
      aria-labelledby="update-decks-title"
    >
      <h2 id="update-decks-title">{heading}</h2>
      <p>{lead}</p>
      <ul className="update-decks-list" data-testid="update-decks-list">
        {decks.map(d => (
          <li key={d.id}>
            <label data-testid={`update-decks-option-${d.id}`}>
              <input
                type="checkbox"
                checked={Boolean(selected[d.id])}
                onChange={() => toggle(d.id)}
                data-testid={`update-decks-check-${d.id}`}
              />{' '}
              <strong>{d.title}</strong>
              <span className="update-decks-meta">
                {' '}
                — {d.linkedSlideCount} linked slide
                {d.linkedSlideCount === 1 ? '' : 's'}
                {d.handEditedSlideCount > 0
                  ? ` (${d.handEditedSlideCount} hand-edited)`
                  : ''}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="update-decks-prompt-actions">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (selectedIds.length === 0) {
              onSkip();
              return;
            }
            if (handEditedInSelection > 0) {
              setPhase('hand-edit');
              return;
            }
            onConfirm(selectedIds, false);
          }}
          data-testid="update-decks-apply"
        >
          {selectedIds.length === 0
            ? 'Continue without updating decks'
            : mode === 'edit'
              ? 'Update selected decks'
              : 'Remove slides from selected decks'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSkip}
          data-testid="update-decks-skip"
        >
          Skip deck updates
        </button>
      </div>
    </section>
  );
}
