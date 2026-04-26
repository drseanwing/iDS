import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('renders the 404 heading', () => {
    render(<NotFoundPage />);
    expect(screen.getByText('404')).toBeDefined();
  });

  it('renders "Page not found" subheading', () => {
    render(<NotFoundPage />);
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeDefined();
  });

  it('calls onNavigateHome when "Go back home" button is clicked', () => {
    const onNavigateHome = vi.fn();
    render(<NotFoundPage onNavigateHome={onNavigateHome} />);
    fireEvent.click(screen.getByRole('button', { name: /go back home/i }));
    expect(onNavigateHome).toHaveBeenCalledOnce();
  });
});
