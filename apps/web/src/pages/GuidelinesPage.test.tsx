import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GuidelinesPage } from './GuidelinesPage';
import { I18nProvider } from '../lib/i18n';

const getMock = vi.fn();
vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(() => Promise.resolve({ data: { id: 'gl-new', title: 'New GL', status: 'DRAFT', updatedAt: new Date().toISOString() } })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>{ui}</I18nProvider>
    </QueryClientProvider>,
  );
}

const sampleGuideline = {
  id: 'gl-1',
  title: 'Hypertension Guidelines',
  shortName: 'HTN-2024',
  status: 'DRAFT',
  description: 'Guidelines for managing hypertension',
  updatedAt: new Date().toISOString(),
};

describe('GuidelinesPage', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders the page heading', async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<GuidelinesPage />);
    // Heading rendered via i18n key
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });

  it('shows empty state when no guidelines exist', async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<GuidelinesPage />);
    await waitFor(() => {
      expect(screen.getByText(/No guidelines found/i)).toBeDefined();
    });
  });

  it('renders a guideline card with title and short name', async () => {
    getMock.mockResolvedValue({ data: { data: [sampleGuideline] } });
    renderWithProviders(<GuidelinesPage />);
    await waitFor(() => {
      expect(screen.getByText('Hypertension Guidelines')).toBeDefined();
    });
    expect(screen.getByText('HTN-2024')).toBeDefined();
    expect(screen.getByText('DRAFT')).toBeDefined();
  });

  it('shows the description of a guideline', async () => {
    getMock.mockResolvedValue({ data: { data: [sampleGuideline] } });
    renderWithProviders(<GuidelinesPage />);
    await waitFor(() => {
      expect(screen.getByText('Guidelines for managing hypertension')).toBeDefined();
    });
  });

  it('opens new guideline form when the new button is clicked', async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<GuidelinesPage />);
    const newBtn = await screen.findByRole('button', { name: /new/i });
    fireEvent.click(newBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Guideline title')).toBeDefined();
    });
  });

  it('disables Create button when title is empty in the form', async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<GuidelinesPage />);
    const newBtn = await screen.findByRole('button', { name: /new/i });
    fireEvent.click(newBtn);
    await waitFor(() => {
      const createBtn = screen.getByRole('button', { name: /create guideline/i }) as HTMLButtonElement;
      expect(createBtn.disabled).toBe(true);
    });
  });

  it('enables Create button when a title is typed', async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<GuidelinesPage />);
    const newBtn = await screen.findByRole('button', { name: /new/i });
    fireEvent.click(newBtn);
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Guideline title');
      fireEvent.change(input, { target: { value: 'My New Guideline' } });
    });
    const createBtn = screen.getByRole('button', { name: /create guideline/i }) as HTMLButtonElement;
    expect(createBtn.disabled).toBe(false);
  });

  it('closes the form when Cancel is clicked', async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<GuidelinesPage />);
    const newBtn = await screen.findByRole('button', { name: /new/i });
    fireEvent.click(newBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Guideline title')).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Guideline title')).toBeNull();
    });
  });

  it('calls onOpenGuideline when a guideline card is clicked', async () => {
    getMock.mockResolvedValue({ data: { data: [sampleGuideline] } });
    const onOpen = vi.fn();
    renderWithProviders(<GuidelinesPage onOpenGuideline={onOpen} />);
    await waitFor(() => {
      expect(screen.getByText('Hypertension Guidelines')).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /Open guideline: Hypertension Guidelines/i }));
    expect(onOpen).toHaveBeenCalledWith('gl-1');
  });
});
