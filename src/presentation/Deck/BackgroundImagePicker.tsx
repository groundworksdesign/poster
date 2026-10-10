import React, { useRef, useState } from 'react';
import { BackgroundFit, BackgroundImageSpec } from '../../domain/PresentTypes';
import {
  DEFAULT_BACKGROUND_DIM,
  DEFAULT_BACKGROUND_FIT,
  makeBackgroundImageSpec,
  normalizeBackgroundDim,
  normalizeBackgroundFit,
} from '../../domain/backgroundImage';
import { embedImageFromFile, embedImageFromUrl } from '../../domain/embedImage';

export type BackgroundImagePickerProps = {
  label: string;
  value?: BackgroundImageSpec | null;
  /** Called with a new spec, or undefined to clear / use deck default (parent decides). */
  onChange: (next: BackgroundImageSpec | undefined) => void;
  /** Optional reset control label; when set, shows a button that calls onUseDeckDefault. */
  useDeckDefaultLabel?: string;
  onUseDeckDefault?: () => void;
  /** When true, show Clear instead of only replacing via picker. */
  showClear?: boolean;
  testIdPrefix?: string;
};

/**
 * File or URL image picker that always embeds into a data URL.
 * Failed URL downloads show an error and leave the field empty (AC-008).
 */
export default function BackgroundImagePicker({
  label,
  value,
  onChange,
  useDeckDefaultLabel,
  onUseDeckDefault,
  showClear = true,
  testIdPrefix = 'bg-picker',
}: BackgroundImagePickerProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fit = normalizeBackgroundFit(value?.fit);
  const dim = normalizeBackgroundDim(value?.dim);
  const hasImage = typeof value?.image === 'string' && value.image.trim().length > 0;

  const applyEmbedded = (dataUrl: string, prev?: BackgroundImageSpec | null) => {
    onChange(
      makeBackgroundImageSpec(dataUrl, {
        fit: normalizeBackgroundFit(prev?.fit),
        dim: normalizeBackgroundDim(prev?.dim),
      })
    );
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await embedImageFromFile(file);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      onChange(makeBackgroundImageSpec('', { fit, dim }));
      return;
    }
    applyEmbedded(result.dataUrl, value);
    setUrlDraft('');
  };

  const onUrlApply = async () => {
    setBusy(true);
    setError(null);
    const result = await embedImageFromUrl(urlDraft);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      // Leave the field empty on failure (AC-008).
      onChange(makeBackgroundImageSpec('', { fit, dim }));
      setUrlDraft('');
      return;
    }
    applyEmbedded(result.dataUrl, value);
    setUrlDraft('');
  };

  const onFit = (next: BackgroundFit) => {
    onChange({
      ...(value || {}),
      image: value?.image || '',
      fit: next,
      dim,
    });
  };

  const onDim = (next: number) => {
    onChange({
      ...(value || {}),
      image: value?.image || '',
      fit,
      dim: normalizeBackgroundDim(next),
    });
  };

  return (
    <div data-testid={testIdPrefix} style={{ display: 'grid', gap: 6, marginTop: 8 }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          data-testid={`${testIdPrefix}-file`}
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            void onFile(f);
            e.target.value = '';
          }}
        />
        <input
          type="url"
          placeholder="https://… image URL"
          value={urlDraft}
          disabled={busy}
          data-testid={`${testIdPrefix}-url`}
          onChange={(e) => setUrlDraft(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <button
          type="button"
          data-testid={`${testIdPrefix}-url-apply`}
          disabled={busy || !urlDraft.trim()}
          onClick={() => void onUrlApply()}
        >
          Use URL
        </button>
        {showClear && (
          <button
            type="button"
            data-testid={`${testIdPrefix}-clear`}
            disabled={busy || !hasImage}
            onClick={() => {
              setError(null);
              setUrlDraft('');
              onChange(undefined);
            }}
          >
            Clear
          </button>
        )}
        {useDeckDefaultLabel && onUseDeckDefault && (
          <button
            type="button"
            data-testid={`${testIdPrefix}-use-deck-default`}
            disabled={busy}
            onClick={() => {
              setError(null);
              setUrlDraft('');
              onUseDeckDefault();
            }}
          >
            {useDeckDefaultLabel}
          </button>
        )}
      </div>
      {hasImage && (
        <div
          data-testid={`${testIdPrefix}-preview`}
          title="Embedded background preview"
          style={{
            width: 160,
            height: 90,
            backgroundImage: `url(${value!.image})`,
            backgroundSize: fit === 'tile' ? 'auto' : fit === 'fit' ? 'contain' : 'cover',
            backgroundRepeat: fit === 'tile' ? 'repeat' : 'no-repeat',
            backgroundPosition: 'center',
            backgroundColor: '#111',
            position: 'relative',
          }}
        >
          {dim > 0 && (
            <div
              data-testid={`${testIdPrefix}-dim-overlay`}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: `rgba(0,0,0,${dim})`,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <label>
          Fit:{' '}
          <select
            data-testid={`${testIdPrefix}-fit`}
            value={fit}
            onChange={(e) => onFit(e.target.value as BackgroundFit)}
          >
            <option value="fill">fill</option>
            <option value="fit">fit</option>
            <option value="tile">tile</option>
          </select>
        </label>
        <label>
          Dim:{' '}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={dim}
            data-testid={`${testIdPrefix}-dim`}
            onChange={(e) => onDim(Number(e.target.value))}
          />{' '}
          <span data-testid={`${testIdPrefix}-dim-value`}>{dim.toFixed(2)}</span>
        </label>
      </div>
      {error && (
        <div data-testid={`${testIdPrefix}-error`} role="alert" style={{ color: '#b00020' }}>
          {error}
        </div>
      )}
      {!hasImage && !error && (
        <div data-testid={`${testIdPrefix}-empty`} style={{ opacity: 0.7, fontSize: 12 }}>
          No image (default fit {DEFAULT_BACKGROUND_FIT}, dim {DEFAULT_BACKGROUND_DIM}).
        </div>
      )}
    </div>
  );
}
