import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublishDialog } from './PublishDialog';

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('PublishDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Publish New Version heading', () => {
    renderWithQuery(
      <PublishDialog guidelineId="gl-1" latestVersion={null} onClose={() => {}} />,
    );
    expect(screen.getByText('Publish New Version')).toBeDefined();
  });

  it('computes initial next version as v1.0 when no prior version exists', () => {
    renderWithQuery(
      <PublishDialog guidelineId="gl-1" latestVersion={null} onClose={() => {}} />,
    );
    expect(screen.getByText('v1.0')).toBeDefined();
  });

  it('bumps major version from latest (v2.3 -> v3.0)', () => {
    renderWithQuery(
      <PublishDialog guidelineId="gl-1" latestVersion="2.3" onClose={() => {}} />,
    );
    expect(screen.getByText('v3.0')).toBeDefined();
  });

  it('switches to minor bump when Minor radio is selected', () => {
    renderWithQuery(
      <PublishDialog guidelineId="gl-1" latestVersion="2.3" onClose={() => {}} />,
    );
    fireEvent.click(screen.getByLabelText('Minor'));
    expect(screen.getByText('v2.4')).toBeDefined();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderWithQuery(
      <PublishDialog guidelineId="gl-1" latestVersion={null} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
