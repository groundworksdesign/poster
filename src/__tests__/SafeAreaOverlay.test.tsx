import React from 'react';
import { render, screen } from '@testing-library/react';
import SafeAreaOverlay from '../presentation/Present/SafeAreaOverlay';

describe('SafeAreaOverlay', () => {
  it('renders null when visible is false', () => {
    const { container } = render(<SafeAreaOverlay visible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders both safe-area boxes when visible is true', () => {
    render(<SafeAreaOverlay visible={true} />);
    expect(screen.getByTestId('safe-area-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('safe-area-action')).toBeInTheDocument();
    expect(screen.getByTestId('safe-area-title')).toBeInTheDocument();
  });

  it('action-safe box has correct inset (5%)', () => {
    render(<SafeAreaOverlay visible={true} />);
    const actionBox = screen.getByTestId('safe-area-action');
    expect(actionBox).toHaveStyle({ top: '5%', left: '5%', right: '5%', bottom: '5%' });
  });

  it('title-safe box has correct inset (10%)', () => {
    render(<SafeAreaOverlay visible={true} />);
    const titleBox = screen.getByTestId('safe-area-title');
    expect(titleBox).toHaveStyle({ top: '10%', left: '10%', right: '10%', bottom: '10%' });
  });

  it('overlay wrapper has pointer-events none and correct z-index', () => {
    render(<SafeAreaOverlay visible={true} />);
    const overlay = screen.getByTestId('safe-area-overlay');
    expect(overlay).toHaveStyle({ pointerEvents: 'none', zIndex: 9000 });
  });

  it('shows "action safe" and "title safe" labels', () => {
    render(<SafeAreaOverlay visible={true} />);
    expect(screen.getByText('action safe')).toBeInTheDocument();
    expect(screen.getByText('title safe')).toBeInTheDocument();
  });
});
