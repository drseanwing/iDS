import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskCreateForm } from './TaskCreateForm';

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('TaskCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the New Task heading and required title field', () => {
    renderWithQuery(<TaskCreateForm guidelineId="gl-1" onClose={() => {}} />);
    expect(screen.getByText('New Task')).toBeDefined();
    expect(screen.getByPlaceholderText('Task title')).toBeDefined();
  });

  it('renders description textarea and due date input', () => {
    renderWithQuery(<TaskCreateForm guidelineId="gl-1" onClose={() => {}} />);
    expect(screen.getByPlaceholderText('Optional description')).toBeDefined();
    expect(screen.getByText('Due Date')).toBeDefined();
  });

  it('disables the Create button when title is empty', () => {
    renderWithQuery(<TaskCreateForm guidelineId="gl-1" onClose={() => {}} />);
    const createBtn = screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement;
    expect(createBtn.disabled).toBe(true);
  });

  it('enables the Create button once a title is typed', () => {
    renderWithQuery(<TaskCreateForm guidelineId="gl-1" onClose={() => {}} />);
    const input = screen.getByPlaceholderText('Task title') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Write tests' } });
    const createBtn = screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement;
    expect(createBtn.disabled).toBe(false);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderWithQuery(<TaskCreateForm guidelineId="gl-1" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
