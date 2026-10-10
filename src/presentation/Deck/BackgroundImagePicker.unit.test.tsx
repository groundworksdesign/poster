import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BackgroundImagePicker from './BackgroundImagePicker';
import { FETCH_IMAGE_API_PATH } from '../../domain/embedImage';

describe('BackgroundImagePicker', () => {
  it('embeds a successful URL and calls onChange with fill default', async () => {
    const onChange = jest.fn();
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      expect(String(input)).toBe(FETCH_IMAGE_API_PATH);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          dataUrl: 'data:image/png;base64,abc',
          mimeType: 'image/png',
        }),
      } as any;
    });

    render(<BackgroundImagePicker label="Whole-slide" value={undefined} onChange={onChange} />);

    await userEvent.type(screen.getByTestId('bg-picker-url'), 'https://example.com/a.png');
    await userEvent.click(screen.getByTestId('bg-picker-url-apply'));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const spec = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(spec.image).toBe('data:image/png;base64,abc');
    expect(spec.fit).toBe('fill');
    fetchMock.mockRestore();
  });

  it('N1: failed URL shows an error and does not wipe an existing image', async () => {
    const onChange = jest.fn();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, error: 'Could not download the image (HTTP 500).' }),
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
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('bg-picker-preview')).toBeInTheDocument();
    // Race: failed URL is cleared from the input; existing image stays.
    expect((screen.getByTestId('bg-picker-url') as HTMLInputElement).value).toBe('');
    fetchMock.mockRestore();
  });

  it('N1: failed URL on empty inherit does not create an empty override', async () => {
    const onChange = jest.fn();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, error: 'Could not download the image (HTTP 404).' }),
    } as any);

    render(<BackgroundImagePicker label="Override" value={undefined} onChange={onChange} />);

    await userEvent.type(screen.getByTestId('bg-picker-url'), 'https://example.com/missing.png');
    await userEvent.click(screen.getByTestId('bg-picker-url-apply'));

    await waitFor(() => expect(screen.getByTestId('bg-picker-error')).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
    expect((screen.getByTestId('bg-picker-url') as HTMLInputElement).value).toBe('');
    fetchMock.mockRestore();
  });

  it('N5: file input accepts images only; non-image file shows an error and does not call onChange', async () => {
    const onChange = jest.fn();
    render(<BackgroundImagePicker label="Whole-slide" value={undefined} onChange={onChange} />);
    const input = screen.getByTestId('bg-picker-file') as HTMLInputElement;
    expect(input.accept).toBe('image/*');
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    await userEvent.upload(input, file);
    await waitFor(() => expect(screen.getByTestId('bg-picker-error')).toBeInTheDocument());
    expect(screen.getByTestId('bg-picker-error').textContent).toMatch(/image file/i);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('preview uses a scaled Present non-title frame', () => {
    render(
      <BackgroundImagePicker
        label="Whole-slide"
        value={{ image: 'data:image/png;base64,x', fit: 'tile', dim: 0 }}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('bg-picker-preview')).toHaveAttribute('data-present-frame', 'non-title');
    expect(screen.getByTestId('bg-picker-preview-frame')).toBeInTheDocument();
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
