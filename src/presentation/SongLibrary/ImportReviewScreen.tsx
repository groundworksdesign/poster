import React from 'react';
import type {
  ImportReviewPlan,
  ImportSelections,
  NoLyricsAction,
  TitleMatchAction,
} from '../../domain/songImport';

type Props = {
  plan: ImportReviewPlan;
  selections: ImportSelections;
  busy?: boolean;
  confirmLabel?: string;
  busyLabel?: string;
  onChange: (next: ImportSelections) => void;
  onConfirm: () => void;
};

/**
 * Shared one-screen import review UI (checklist, no-lyrics, title-match).
 * Used by library Import and Add-song-slide chooser import.
 */
export default function ImportReviewScreen({
  plan,
  selections,
  busy,
  confirmLabel = 'Import',
  busyLabel = 'Importing...',
  onChange,
  onConfirm,
}: Props) {
  const toggleChecked = (key: string) => {
    const set = new Set(selections.checkedKeys);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    onChange({ ...selections, checkedKeys: Array.from(set) });
  };

  const selectAll = (checked: boolean) => {
    onChange({
      ...selections,
      checkedKeys: checked ? plan.candidates.map(c => c.key) : [],
    });
  };

  return (
    <section className="import-review" data-testid="import-review-screen">
      <h2>Review import: {plan.fileName}</h2>
      <p>{plan.candidates.length} song(s). Nothing is imported until you confirm.</p>

      <div className="import-review-checklist" data-testid="import-checklist">
        <div className="import-review-checklist-actions">
          <button type="button" onClick={() => selectAll(true)} data-testid="import-select-all">
            Select all
          </button>
          <button type="button" onClick={() => selectAll(false)} data-testid="import-select-none">
            Select none
          </button>
        </div>
        <ul>
          {plan.candidates.map(c => (
            <li key={c.key}>
              <label>
                <input
                  type="checkbox"
                  checked={selections.checkedKeys.includes(c.key)}
                  onChange={() => toggleChecked(c.key)}
                  data-testid={`import-check-${c.key}`}
                />{' '}
                <strong>{c.title}</strong>
                {c.book || c.number ? ` — ${[c.book, c.number].filter(Boolean).join(' ')}` : ''}
                {!c.hasLyrics ? ' (no lyrics)' : ''}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {plan.noLyricsKeys.length > 0 ? (
        <div className="import-review-section" data-testid="import-no-lyrics-section">
          <h3>Songs with no lyrics</h3>
          <p>Choose one action for all no-lyrics songs that stay checked.</p>
          <label>
            <input
              type="radio"
              name="no-lyrics"
              checked={selections.noLyricsAction === 'title_only'}
              onChange={() =>
                onChange({ ...selections, noLyricsAction: 'title_only' as NoLyricsAction })
              }
              data-testid="import-no-lyrics-title-only"
            />{' '}
            Import as title only
          </label>
          <label>
            <input
              type="radio"
              name="no-lyrics"
              checked={selections.noLyricsAction === 'skip'}
              onChange={() =>
                onChange({ ...selections, noLyricsAction: 'skip' as NoLyricsAction })
              }
              data-testid="import-no-lyrics-skip"
            />{' '}
            Skip them
          </label>
        </div>
      ) : null}

      {plan.titleMatches.length > 0 ? (
        <div className="import-review-section" data-testid="import-title-match-section">
          <h3>Title matches</h3>
          {plan.titleMatches.map(m => (
            <div
              key={m.candidateKey}
              className="import-title-match"
              data-testid={`import-title-match-${m.candidateKey}`}
            >
              <p>
                <strong>{m.existingTitle}</strong> already exists.
              </p>
              <div className="import-title-match-compare">
                <div>
                  <h4>In library</h4>
                  <p>Number: {m.existingNumber ?? '(none)'}</p>
                  <p>Lyrics: {m.existingLyricsPreview}</p>
                </div>
                <div>
                  <h4>Incoming</h4>
                  <p>Number: {m.incomingNumber ?? '(none)'}</p>
                  <p>Lyrics: {m.incomingLyricsPreview}</p>
                </div>
              </div>
              {(
                [
                  ['keep_both', 'Keep both (default)'],
                  ['replace', 'Replace library song'],
                  ['skip', 'Skip incoming'],
                ] as [TitleMatchAction, string][]
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={`match-${m.candidateKey}`}
                    checked={
                      (selections.titleMatchActions[m.candidateKey] ?? 'keep_both') === value
                    }
                    onChange={() =>
                      onChange({
                        ...selections,
                        titleMatchActions: {
                          ...selections.titleMatchActions,
                          [m.candidateKey]: value,
                        },
                      })
                    }
                    data-testid={`import-match-${m.candidateKey}-${value}`}
                  />{' '}
                  {label}
                </label>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="import-confirm"
        disabled={busy}
        onClick={onConfirm}
        data-testid="import-confirm"
      >
        {busy ? busyLabel : confirmLabel}
      </button>
    </section>
  );
}
