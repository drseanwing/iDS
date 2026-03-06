import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReorderSections } from './useReorderSections';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useReorderSections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts to /sections/reorder with the provided sections', async () => {
    const postFn = apiClient.post as ReturnType<typeof vi.fn>;
    postFn.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useReorderSections(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate({
      guidelineId: 'gl-1',
      sections: [
        { id: 'sec-1', ordering: 0 },
        { id: 'sec-2', ordering: 1 },
      ],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postFn).toHaveBeenCalledWith('/sections/reorder', {
      sections: [
        { id: 'sec-1', ordering: 0 },
        { id: 'sec-2', ordering: 1 },
      ],
    });
  });

  it('is in pending state while mutation is in flight', async () => {
    const postFn = apiClient.post as ReturnType<typeof vi.fn>;
    let resolvePost: ((v: unknown) => void) | undefined;
    postFn.mockImplementation(() => new Promise((res) => { resolvePost = res; }));

    const { result } = renderHook(() => useReorderSections(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate({
      guidelineId: 'gl-1',
      sections: [{ id: 'sec-1', ordering: 0 }],
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    // Resolve the pending mutation
    resolvePost?.({ data: [] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
