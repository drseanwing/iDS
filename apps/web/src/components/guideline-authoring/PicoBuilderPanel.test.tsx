import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PicoBuilderPanel } from './PicoBuilderPanel';
import type { Pico } from '../../hooks/usePicos';

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

function makePico(overrides: Partial<Pico> = {}): Pico {
  return {
    id: 'pico-1',
    guidelineId: 'gl-1',
    population: 'Adults with hypertension',
    intervention: 'ACE inhibitors',
    comparator: 'Placebo',
    outcomes: [],
    codes: [],
    practicalIssues: [],
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// suppress console.error for act() warnings in tests
beforeEach(() => {
  vi.clearAllMocks();
});

describe('PicoBuilderPanel', () => {
  it('shows loading spinner initially then panel header', async () => {
    renderWithQuery(<PicoBuilderPanel guidelineId="gl-1" />);
    // After query resolves, the panel header becomes visible
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Evidence Profiles/i })).toBeDefined();
    });
    expect(screen.getByRole('button', { name: /new pico/i })).toBeDefined();
  });

  it('shows empty state message when there are no PICOs', async () => {
    renderWithQuery(<PicoBuilderPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText(/No PICO evidence profiles yet/i)).toBeDefined();
    });
  });

  it('shows "New PICO" form when button is clicked', async () => {
    renderWithQuery(<PicoBuilderPanel guidelineId="gl-1" />);
    await waitFor(() => screen.getByRole('button', { name: /new pico/i }));

    fireEvent.click(screen.getByRole('button', { name: /new pico/i }));
    expect(screen.getByText('New PICO question')).toBeDefined();
    expect(screen.getByLabelText('Population (P)')).toBeDefined();
    expect(screen.getByLabelText('Intervention (I)')).toBeDefined();
    expect(screen.getByLabelText('Comparator (C)')).toBeDefined();
  });

  it('closes "New PICO" form when Cancel is clicked', async () => {
    renderWithQuery(<PicoBuilderPanel guidelineId="gl-1" />);
    await waitFor(() => screen.getByRole('button', { name: /new pico/i }));

    fireEvent.click(screen.getByRole('button', { name: /new pico/i }));
    expect(screen.getByText('New PICO question')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('New PICO question')).toBeNull();
  });

  it('disables Create PICO button when fields are empty', async () => {
    renderWithQuery(<PicoBuilderPanel guidelineId="gl-1" />);
    await waitFor(() => screen.getByRole('button', { name: /new pico/i }));

    fireEvent.click(screen.getByRole('button', { name: /new pico/i }));
    const createButton = screen.getByRole('button', { name: /create pico/i });
    expect((createButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables Create PICO button when all fields are filled', async () => {
    renderWithQuery(<PicoBuilderPanel guidelineId="gl-1" />);
    await waitFor(() => screen.getByRole('button', { name: /new pico/i }));

    fireEvent.click(screen.getByRole('button', { name: /new pico/i }));

    fireEvent.change(screen.getByLabelText('Population (P)'), {
      target: { value: 'Adults' },
    });
    fireEvent.change(screen.getByLabelText('Intervention (I)'), {
      target: { value: 'Drug A' },
    });
    fireEvent.change(screen.getByLabelText('Comparator (C)'), {
      target: { value: 'Placebo' },
    });

    const createButton = screen.getByRole('button', { name: /create pico/i });
    expect((createButton as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('PicoBuilderPanel with data', () => {
  it('shows PICO card when data is returned', async () => {
    const { apiClient } = await import('../../lib/api-client');
    const pico = makePico();
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [pico] },
    });

    renderWithQuery(<PicoBuilderPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText(/Adults with hypertension/)).toBeDefined();
    });
    expect(screen.getByText(/ACE inhibitors/)).toBeDefined();
  });

  it('shows outcome count badge on PICO card', async () => {
    const { apiClient } = await import('../../lib/api-client');
    const pico = makePico({
      outcomes: [
        {
          id: 'o-1',
          picoId: 'pico-1',
          title: 'All-cause mortality',
          outcomeType: 'DICHOTOMOUS',
          state: 'FINISHED',
          ordering: 0,
          isDeleted: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    });
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [pico] },
    });

    renderWithQuery(<PicoBuilderPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('1 outcome')).toBeDefined();
    });
  });
});

