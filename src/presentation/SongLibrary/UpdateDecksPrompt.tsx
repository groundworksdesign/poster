import React, { useMemo, useState } from 'react';

export type DeckUsageOption = {
  id: string;
  title: string;
  linkedSlideCount: number;
  handEditedSlideCount: number;
  /** Skipped prior library update — not a user text edit. */
  outOfDateSlideCount?: number;
};

type Props = {
  mode: 'edit' | 'delete';
  songTitle: string;
  decks: DeckUsageOption[];
  busy?: boolean;
  onConfirm: (deckIds: string[], overwriteHandEdited: boolean) => void;
  onSkip: () => void;
};

function initialSelection(decks: DeckUsageOption[]): Record<string, boolean> {
  const init: Record<string, boolean> = {};
  for (const d of decks) init[d.id] = false;
  return init;
}

function deckStatusBits(d: DeckUsageOption): string[] {
  const bits: string[] = [];
  if (d.handEditedSlideCount > 0) {
    bits.push(
      `${d.handEditedSlideCount} edited by hand`,
    );
  }
  const outOfDate = d.outOfDateSlideCount ?? 0;
  if (outOfDate > 0) {
    bits.push(
      `${outOfDate} Not updated to the latest library version`,
    );
  }
  return bits;
}

/**
 * REQ-012 / REQ-023: ask about updating decks only when the song is used;
 * list decks with checkboxes. REQ-016: extra confirm for hand-edited / out-of-date slides.
 *
 * Selection is initialized once at mount (parent should remount via `key` when
 * the prompt target changes). Do not reset selection in an effect — that races
 * with fast checkbox + Apply clicks in full-file Jest runs.
 */
export default function UpdateDecksPrompt({
  mode,
  songTitle,
  decks,
  busy,
  onConfirm,
  onSkip,
}: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    initialSelection(decks),
  );
  const [phase, setPhase] = useState<'choose' | 'hand-edit'>('choose');

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

  const outOfDateInSelection = useMemo(
    () =>
      decks
        .filter(d => selected[d.id])
        .reduce((sum, d) => sum + (d.outOfDateSlideCount || 0), 0),
    [decks, selected],
  );

  const confirmCount = handEditedInSelection + outOfDateInSelection;

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
    const parts: string[] = [];
    if (handEditedInSelection > 0) {
      parts.push(
        `${handEditedInSelection} edited by hand`,
      );
    }
    if (outOfDateInSelection > 0) {
      parts.push(
        `${outOfDateInSelection} not updated to the latest library version`,
      );
    }
    return (
      <section
        className="update-decks-prompt"
        data-testid="update-decks-hand-edit-prompt"
        role="dialog"
        aria-labelledby="update-decks-hand-edit-title"
      >
        <h2 id="update-decks-hand-edit-title">Overwrite protected slides?</h2>
        <p>
          {parts.join('; ')} in the selected deck
          {selectedIds.length === 1 ? '' : 's'}. Overwrite
          {mode === 'delete' ? ' / remove' : ''} them too?
        </p>
        <div className="update-decks-prompt-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(selectedIds, true)}
            data-testid="update-decks-overwrite-yes"
          >
            Yes, include them
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(selectedIds, false)}
            data-testid="update-decks-overwrite-no"
          >
            No, leave them alone
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
        {decks.map(d => {
          const bits = deckStatusBits(d);
          return (
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
                  {bits.length > 0 ? (
                    <span data-testid={`update-decks-status-${d.id}`}>
                      {' '}
                      ({bits.join('; ')})
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
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
            if (confirmCount > 0) {
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
