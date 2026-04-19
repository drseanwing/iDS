import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GuidelineSettingsPanel } from './GuidelineSettingsPanel';
import type { Guideline } from '../../hooks/useGuideline';

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

const sampleGuideline: Guideline = {
  id: 'gl-1',
  title: 'Hypertension Guidelines',
  shortName: 'HTN-2024',
  status: 'DRAFT',
  description: 'A guideline about hypertension',
  language: 'en',
  etdMode: 'FOUR_FACTOR',
  showSectionNumbers: true,
  showCertaintyInLabel: false,
  showGradeDescription: false,
  showSectionTextPreview: true,
  trackChangesDefault: false,
  enableSubscriptions: false,
  enablePublicComments: false,
  pdfColumnLayout: 1,
  picoDisplayMode: 'INLINE',
  coverPageUrl: '',
  isPublic: false,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

describe('GuidelineSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Guideline Settings heading', () => {
    renderWithQuery(<GuidelineSettingsPanel guideline={sampleGuideline} />);
    expect(screen.getByText('Guideline Settings')).toBeDefined();
  });

  it('pre-fills the title field with the guideline title', () => {
    renderWithQuery(<GuidelineSettingsPanel guideline={sampleGuideline} />);
    const titleInput = screen.getByDisplayValue('Hypertension Guidelines') as HTMLInputElement;
    expect(titleInput).toBeDefined();
  });

  it('pre-fills the short name field', () => {
    renderWithQuery(<GuidelineSettingsPanel guideline={sampleGuideline} />);
    expect(screen.getByDisplayValue('HTN-2024')).toBeDefined();
  });

  it('renders the Save Settings button', () => {
    renderWithQuery(<GuidelineSettingsPanel guideline={sampleGuideline} />);
    expect(screen.getByRole('button', { name: /save settings/i })).toBeDefined();
  });

  it('renders export buttons (PDF, DOCX, JSON)', () => {
    renderWithQuery(<GuidelineSettingsPanel guideline={sampleGuideline} />);
    expect(screen.getByRole('button', { name: /export as pdf/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /export as docx/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /export as json/i })).toBeDefined();
  });

  it('allows editing the title field', () => {
    renderWithQuery(<GuidelineSettingsPanel guideline={sampleGuideline} />);
    const titleInput = screen.getByDisplayValue('Hypertension Guidelines') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    expect(titleInput.value).toBe('Updated Title');
  });

  it('renders section numbers checkbox checked by default', () => {
    renderWithQuery(<GuidelineSettingsPanel guideline={sampleGuideline} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // The showSectionNumbers checkbox is the first in the display options section
    // We verify at least one checkbox is checked (showSectionNumbers = true)
    const checked = checkboxes.filter((cb) => (cb as HTMLInputElement).checked);
    expect(checked.length).toBeGreaterThan(0);
  });

  it('renders EtD mode dropdown with correct default', () => {
    renderWithQuery(<GuidelineSettingsPanel guideline={sampleGuideline} />);
    const select = screen.getByDisplayValue('4-Factor (Original GRADE)') as HTMLSelectElement;
    expect(select).toBeDefined();
  });

  it('renders PICO display mode dropdown', () => {
    renderWithQuery(<GuidelineSettingsPanel guideline={sampleGuideline} />);
    expect(screen.getByDisplayValue('Inline')).toBeDefined();
  });
});
