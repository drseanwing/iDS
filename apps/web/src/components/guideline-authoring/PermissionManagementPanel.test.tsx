import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionManagementPanel } from './PermissionManagementPanel';

// ---------------------------------------------------------------------------
// Mock the API client so TanStack Query hooks hit no real network
// ---------------------------------------------------------------------------
const getMock = vi.fn();
const postMock = vi.fn(() => Promise.resolve({ data: {} }));
const deleteMock = vi.fn(() => Promise.resolve({ data: {} }));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const sampleMember = {
  id: 'perm-1',
  guidelineId: 'gl-1',
  userId: 'user-1',
  role: 'REVIEWER' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  user: {
    id: 'user-1',
    displayName: 'Bob Jones',
    email: 'bob@example.com',
  },
};

const adminMember = {
  ...sampleMember,
  id: 'perm-2',
  userId: 'user-2',
  role: 'ADMIN' as const,
  user: {
    id: 'user-2',
    displayName: 'Carol Admin',
    email: 'carol@example.com',
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PermissionManagementPanel', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    deleteMock.mockReset();
    postMock.mockResolvedValue({ data: {} });
    deleteMock.mockResolvedValue({ data: {} });
  });

  it('renders the Team Members heading and Add Member form', async () => {
    getMock.mockResolvedValue({ data: [] });
    renderWithQuery(<PermissionManagementPanel guidelineId="gl-1" />);

    expect(screen.getByText('Team Members')).toBeDefined();
    expect(screen.getByText('Add Member')).toBeDefined();
    expect(screen.getByPlaceholderText('User ID')).toBeDefined();
  });

  it('shows empty state when there are no team members', async () => {
    getMock.mockResolvedValue({ data: [] });
    renderWithQuery(<PermissionManagementPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('No team members.')).toBeDefined();
    });
  });

  it('renders team members with display name, email and role badge', async () => {
    getMock.mockResolvedValue({ data: [sampleMember, adminMember] });
    renderWithQuery(<PermissionManagementPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bob Jones')).toBeDefined();
    });
    expect(screen.getByText('bob@example.com')).toBeDefined();
    expect(screen.getByText('Carol Admin')).toBeDefined();
    expect(screen.getByText('carol@example.com')).toBeDefined();
    // Role badges (role names also appear in the dropdown options, so use getAllByText)
    expect(screen.getAllByText('REVIEWER').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ADMIN').length).toBeGreaterThan(0);
  });

  it('Add button is disabled when User ID field is empty', async () => {
    getMock.mockResolvedValue({ data: [] });
    renderWithQuery(<PermissionManagementPanel guidelineId="gl-1" />);

    const addBtn = screen.getByRole('button', { name: /^add$/i }) as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);
  });

  it('Add button becomes enabled after typing a User ID', async () => {
    getMock.mockResolvedValue({ data: [] });
    renderWithQuery(<PermissionManagementPanel guidelineId="gl-1" />);

    fireEvent.change(screen.getByPlaceholderText('User ID'), {
      target: { value: 'user-99' },
    });

    const addBtn = screen.getByRole('button', { name: /^add$/i }) as HTMLButtonElement;
    expect(addBtn.disabled).toBe(false);
  });

  it('clicking remove once shows confirmation prompt, clicking Yes confirms removal', async () => {
    getMock.mockResolvedValue({ data: [sampleMember] });
    renderWithQuery(<PermissionManagementPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bob Jones')).toBeDefined();
    });

    // First click shows the confirmation UI
    const removeBtn = screen.getByTitle('Remove member');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.getByText('Remove?')).toBeDefined();
    });

    // Second click (Yes) triggers the delete mutation
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalled();
    });
  });

  it('clicking No after the confirmation prompt dismisses it', async () => {
    getMock.mockResolvedValue({ data: [sampleMember] });
    renderWithQuery(<PermissionManagementPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bob Jones')).toBeDefined();
    });

    fireEvent.click(screen.getByTitle('Remove member'));

    await waitFor(() => {
      expect(screen.getByText('Remove?')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    await waitFor(() => {
      expect(screen.queryByText('Remove?')).toBeNull();
    });
    // delete should NOT have been called
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
