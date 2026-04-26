// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubscribersPanel } from './SubscribersPanel';

const getMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function subscribersResponse(subscribers: unknown[]) {
  return {
    data: {
      data: subscribers,
      meta: { total: subscribers.length, page: 1, limit: 50, totalPages: 1 },
    },
  };
}

const sampleSubscribers = [
  {
    id: 'sub-1',
    guidelineId: 'gl-1',
    email: 'alice@example.com',
    subscribedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'sub-2',
    guidelineId: 'gl-1',
    email: 'bob@example.com',
    subscribedAt: '2024-02-20T12:00:00Z',
  },
  {
    id: 'sub-3',
    guidelineId: 'gl-1',
    email: 'carol@example.com',
    subscribedAt: '2024-03-10T09:00:00Z',
  },
];

describe('SubscribersPanel', () => {
  beforeEach(() => {
    getMock.mockReset();
    deleteMock.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders subscriber list with email and subscribed date', async () => {
    getMock.mockResolvedValue(subscribersResponse(sampleSubscribers));
    renderWithQuery(<SubscribersPanel guidelineId="gl-1" />);
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeDefined());
    expect(screen.getByText('bob@example.com')).toBeDefined();
    expect(screen.getByText('carol@example.com')).toBeDefined();
  });

  it('shows empty state when there are no subscribers', async () => {
    getMock.mockResolvedValue(subscribersResponse([]));
    renderWithQuery(<SubscribersPanel guidelineId="gl-1" />);
    await waitFor(() => expect(screen.getByText('No subscribers yet')).toBeDefined());
  });

  it('unsubscribe button calls mutation after window.confirm', async () => {
    getMock.mockResolvedValue(subscribersResponse(sampleSubscribers));
    deleteMock.mockResolvedValue({ data: {} });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithQuery(<SubscribersPanel guidelineId="gl-1" />);
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeDefined());

    const buttons = screen.getAllByRole('button', { name: 'Unsubscribe' });
    fireEvent.click(buttons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Unsubscribe alice@example.com?');
    await waitFor(() =>
      expect(deleteMock).toHaveBeenCalledWith('/guidelines/gl-1/subscribers/sub-1'),
    );
  });

  it('shows total subscriber count', async () => {
    getMock.mockResolvedValue(subscribersResponse(sampleSubscribers));
    renderWithQuery(<SubscribersPanel guidelineId="gl-1" />);
    await waitFor(() => expect(screen.getByText('3 subscribers')).toBeDefined());
  });
});
