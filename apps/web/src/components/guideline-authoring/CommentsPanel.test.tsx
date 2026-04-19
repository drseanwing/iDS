import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommentsPanel } from './CommentsPanel';

const getMock = vi.fn();
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function commentsResponse(comments: unknown[]) {
  return {
    data: {
      data: comments,
      meta: { total: comments.length, page: 1, limit: 50, totalPages: 1 },
    },
  };
}

describe('CommentsPanel', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders the Comments header and new comment input', async () => {
    getMock.mockResolvedValue(commentsResponse([]));
    renderWithQuery(<CommentsPanel recommendationId="rec-1" />);
    expect(screen.getByText('Comments')).toBeDefined();
    expect(screen.getByPlaceholderText('Add a comment...')).toBeDefined();
  });

  it('disables the Post button when input is empty', async () => {
    getMock.mockResolvedValue(commentsResponse([]));
    renderWithQuery(<CommentsPanel recommendationId="rec-1" />);
    const post = screen.getByRole('button', { name: 'Post' }) as HTMLButtonElement;
    expect(post.disabled).toBe(true);
  });

  it('shows empty state when there are no comments', async () => {
    getMock.mockResolvedValue(commentsResponse([]));
    renderWithQuery(<CommentsPanel recommendationId="rec-1" />);
    await waitFor(() => expect(screen.getByText('No comments yet.')).toBeDefined());
  });

  it('renders a comment with author name and content', async () => {
    getMock.mockResolvedValue(
      commentsResponse([
        {
          id: 'c-1',
          recommendationId: 'rec-1',
          userId: 'u-1',
          content: 'Consider adding PICO 3',
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: { id: 'u-1', displayName: 'Alice', email: 'a@x.com' },
          replies: [],
        },
      ]),
    );
    renderWithQuery(<CommentsPanel recommendationId="rec-1" />);
    await waitFor(() => expect(screen.getByText('Consider adding PICO 3')).toBeDefined());
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('OPEN')).toBeDefined();
  });

  it('enables the Post button after typing a comment', async () => {
    getMock.mockResolvedValue(commentsResponse([]));
    renderWithQuery(<CommentsPanel recommendationId="rec-1" />);
    const textarea = screen.getByPlaceholderText('Add a comment...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    const post = screen.getByRole('button', { name: 'Post' }) as HTMLButtonElement;
    expect(post.disabled).toBe(false);
  });
});
