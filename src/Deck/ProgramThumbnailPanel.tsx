import React from 'react';
import type { ProgramThumbnailState } from './SessionTransport';

export type ProgramThumbnailPanelProps = {
  program: ProgramThumbnailState | null;
};

/** Deck-side preview of what a Present child reports as on program. */
export function ProgramThumbnailPanel({ program }: ProgramThumbnailPanelProps) {
  return (
    <div
      data-testid="program-thumbnail"
      className="deck-page-panel deck-program-thumbnail"
      aria-label="Program thumbnail"
    >
      <h3>On program</h3>
      {program ? (
        <div
          data-testid="program-thumbnail-preview"
          className="deck-program-thumbnail-preview"
          style={{
            backgroundColor: program.useGreenScreen ? 'transparent' : program.backgroundColor || '#111',
            color: program.color || '#fff',
          }}
        >
          {program.message ? (
            <div data-testid="program-thumbnail-message" className="deck-program-thumbnail-message">
              {program.message}
            </div>
          ) : null}
          {program.title ? <div data-testid="program-thumbnail-title">{program.title}</div> : null}
          {program.subTitle ? (
            <div data-testid="program-thumbnail-subtitle">{program.subTitle}</div>
          ) : null}
          {program.lines && program.lines.length > 0 ? (
            <div data-testid="program-thumbnail-lines">
              {program.lines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          ) : null}
          {!program.title &&
          !program.subTitle &&
          !program.message &&
          !(program.lines && program.lines.length) ? (
            <div data-testid="program-thumbnail-empty-slide">Slide on program</div>
          ) : null}
        </div>
      ) : (
        <p data-testid="program-thumbnail-empty">Nothing on program yet.</p>
      )}
    </div>
  );
}
