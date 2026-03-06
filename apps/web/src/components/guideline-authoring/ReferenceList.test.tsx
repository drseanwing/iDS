import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReferenceList } from './ReferenceList';
import type { Section } from '../../hooks/useSections';

// Mock API client so no real HTTP calls are made
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithQuery(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>,
  );
}

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: 'sec-1',
    guidelineId: 'gl-1',
    title: 'Introduction',
    parentId: null,
    text: null,
    ordering: 0,
    excludeFromNumbering: false,
    isDeleted: false,
    children: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ReferenceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the toolbar with search and add button', () => {
    renderWithQuery(<ReferenceList guidelineId="gl-1" selectedSection={null} />);
    expect(screen.getByPlaceholderText('Search references…')).toBeDefined();
    expect(screen.getByRole('button', { name: /add reference/i })).toBeDefined();
  });

  it('does not show section link banner when no section is selected', () => {
    renderWithQuery(<ReferenceList guidelineId="gl-1" selectedSection={null} />);
    expect(screen.queryByText(/Showing link state for section/i)).toBeNull();
  });

  it('shows section link banner when a section is selected', () => {
    const section = makeSection({ title: 'Methods' });
    renderWithQuery(<ReferenceList guidelineId="gl-1" selectedSection={section} />);
    expect(screen.getByText('Methods')).toBeDefined();
    expect(screen.getByText(/Showing link state for section/i)).toBeDefined();
  });

  it('toggles the add reference form on button click', () => {
    renderWithQuery(<ReferenceList guidelineId="gl-1" selectedSection={null} />);
    const addButton = screen.getByRole('button', { name: /add reference/i });

    // Form not visible initially
    expect(screen.queryByPlaceholderText('Reference title')).toBeNull();

    // Click to open
    fireEvent.click(addButton);
    expect(screen.getByPlaceholderText('Reference title')).toBeDefined();

    // Click again to close
    fireEvent.click(addButton);
    expect(screen.queryByPlaceholderText('Reference title')).toBeNull();
  });

  it('shows the add form with required title field', () => {
    renderWithQuery(<ReferenceList guidelineId="gl-1" selectedSection={null} />);
    fireEvent.click(screen.getByRole('button', { name: /add reference/i }));

    expect(screen.getByPlaceholderText('Reference title')).toBeDefined();
    expect(screen.getAllByText('Add reference').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
  });

  it('closes the form when Cancel is clicked', () => {
    renderWithQuery(<ReferenceList guidelineId="gl-1" selectedSection={null} />);
    fireEvent.click(screen.getByRole('button', { name: /add reference/i }));
    expect(screen.getByPlaceholderText('Reference title')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('Reference title')).toBeNull();
  });
});
