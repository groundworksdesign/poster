import React from 'react';

// Standard broadcast safe-area inset percentages (SMPTE / EBU)
const ACTION_SAFE_INSET = 5;  // 90% of frame
const TITLE_SAFE_INSET = 10;  // 80% of frame

interface SafeAreaOverlayProps {
  visible: boolean;
}

export default function SafeAreaOverlay({ visible }: SafeAreaOverlayProps) {
  if (!visible) return null;

  const boxBase: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  };

  const labelBase: React.CSSProperties = {
    position: 'absolute',
    top: '4px',
    left: '4px',
    fontSize: '10px',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
    padding: '1px 4px',
    lineHeight: '1.4',
    borderRadius: '2px',
    opacity: 0.8,
  };

  return (
    // Outer wrapper fills the parent (which must be position: relative or absolute)
    <div
      data-testid="safe-area-overlay"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9000 }}
    >
      {/* Action-safe: 5% inset, yellow dashed border */}
      <div
        data-testid="safe-area-action"
        style={{
          ...boxBase,
          top: `${ACTION_SAFE_INSET}%`,
          left: `${ACTION_SAFE_INSET}%`,
          right: `${ACTION_SAFE_INSET}%`,
          bottom: `${ACTION_SAFE_INSET}%`,
          border: '1px dashed rgba(255, 220, 0, 0.7)',
        }}
      >
        <span
          style={{
            ...labelBase,
            background: 'rgba(0,0,0,0.55)',
            color: 'rgba(255, 220, 0, 0.9)',
          }}
        >
          action safe
        </span>
      </div>

      {/* Title-safe: 10% inset, cyan dashed border */}
      <div
        data-testid="safe-area-title"
        style={{
          ...boxBase,
          top: `${TITLE_SAFE_INSET}%`,
          left: `${TITLE_SAFE_INSET}%`,
          right: `${TITLE_SAFE_INSET}%`,
          bottom: `${TITLE_SAFE_INSET}%`,
          border: '1px dashed rgba(0, 200, 220, 0.7)',
        }}
      >
        <span
          style={{
            ...labelBase,
            background: 'rgba(0,0,0,0.55)',
            color: 'rgba(0, 200, 220, 0.9)',
          }}
        >
          title safe
        </span>
      </div>
    </div>
  );
}
