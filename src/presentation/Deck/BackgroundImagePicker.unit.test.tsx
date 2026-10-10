import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BackgroundImagePicker from './BackgroundImagePicker';

describe('BackgroundImagePicker', () => {
  it('embeds a successful URL and calls onChange with fill default', async () => {
    const onChange = jest.fn();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'image/png' },
      blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
    } as any);

    render(<BackgroundImagePicker label="Whole-slide" value={undefined} onChange={onChange} />);

    await userEvent.type(screen.getByTestId('bg-picker-url'), 'https://example.com/a.png');
    await userEvent.click(screen.getByTestId('bg-picker-url-apply'));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const spec = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(spec.image.startsWith('data:image/png;base64,')).toBe(true);
    expect(spec.fit).toBe('fill');
    fetchMock.mockRestore();
  });

  it('failed URL shows an error and leaves the field empty (AC-008)', async () => {
    const onChange = jest.fn();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => null },
      blob: async () => new Blob([]),
    } as any);

    render(
      <BackgroundImagePicker
        label="Whole-slide"
        value={{ image: 'data:image/png;base64,old', fit: 'fill', dim: 0 }}
        onChange={onChange}
      />
    );

    await userEvent.type(screen.getByTestId('bg-picker-url'), 'https://example.com/missing.png');
    await userEvent.click(screen.getByTestId('bg-picker-url-apply'));

    await waitFor(() => expect(screen.getByTestId('bg-picker-error')).toBeInTheDocument());
    expect(screen.getByTestId('bg-picker-error').textContent).toMatch(/Could not download/i);
    const spec = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(spec.image).toBe('');
    fetchMock.mockRestore();
  });

  it('Use deck default button calls the reset handler', async () => {
    const onChange = jest.fn();
    const onUseDeckDefault = jest.fn();
    render(
      <BackgroundImagePicker
        label="Override"
        value={{ image: 'data:x', fit: 'fit', dim: 0.2 }}
        onChange={onChange}
        useDeckDefaultLabel="Use deck default"
        onUseDeckDefault={onUseDeckDefault}
      />
    );
    await userEvent.click(screen.getByTestId('bg-picker-use-deck-default'));
    expect(onUseDeckDefault).toHaveBeenCalled();
  });
});
