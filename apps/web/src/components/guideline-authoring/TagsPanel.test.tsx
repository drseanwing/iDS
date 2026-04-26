import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TagsPanel } from './TagsPanel';
import type { Tag } from '../../hooks/useTags';

// ── Mock hooks ──────────────────────────────────────────────────────────────

const mockCreateTagMutate = vi.fn();
const mockUpdateTagMutate = vi.fn();
const mockDeleteTagMutate = vi.fn();

let mockTags: Tag[] = [];
let mockIsLoading = false;
let mockIsError = false;

vi.mock('../../hooks/useTags', () => ({
  useTags: () => ({
    data: mockTags,
    isLoading: mockIsLoading,
    isError: mockIsError,
  }),
  useCreateTag: () => ({
    mutate: mockCreateTagMutate,
    isPending: false,
  }),
  useUpdateTag: () => ({
    mutate: mockUpdateTagMutate,
    isPending: false,
  }),
  useDeleteTag: () => ({
    mutate: mockDeleteTagMutate,
    isPending: false,
  }),
}));

// ── Helper ──────────────────────────────────────────────────────────────────

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 'tag-1',
    guidelineId: 'gl-1',
    name: 'Cardiovascular',
    color: '#3b82f6',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('TagsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTags = [];
    mockIsLoading = false;
    mockIsError = false;
  });

  it('renders the tags list', async () => {
    mockTags = [makeTag({ name: 'Cardiovascular', color: '#3b82f6' })];
    renderWithQuery(<TagsPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('Cardiovascular')).toBeDefined();
    });
  });

  it('shows add form when Add tag button is clicked', async () => {
    mockTags = [];
    renderWithQuery(<TagsPanel guidelineId="gl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add tag/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tag name...')).toBeDefined();
    });
  });

  it('shows empty state when there are no tags', async () => {
    mockTags = [];
    renderWithQuery(<TagsPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('No tags yet')).toBeDefined();
    });
  });

  it('calls delete mutation with confirm', async () => {
    mockTags = [makeTag({ id: 'tag-1', name: 'Pediatrics', guidelineId: 'gl-1' })];
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithQuery(<TagsPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pediatrics')).toBeDefined();
    });

    const deleteBtn = screen.getByLabelText('delete tag Pediatrics');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteTagMutate).toHaveBeenCalledWith(
      { id: 'tag-1', guidelineId: 'gl-1' },
    );
  });

  it('renders color swatches in the add form', async () => {
    mockTags = [];
    renderWithQuery(<TagsPanel guidelineId="gl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add tag/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tag name...')).toBeDefined();
    });

    // There should be 6 color swatch buttons
    const swatches = screen.getAllByRole('button', { name: /^#/ });
    expect(swatches.length).toBe(6);
  });
});
