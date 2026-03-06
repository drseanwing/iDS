import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecommendationEditorCard } from './RecommendationEditorCard';
import type { Recommendation } from '../../hooks/useRecommendations';

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithQuery(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>,
  );
}

function makeRec(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: 'rec-1',
    guidelineId: 'gl-1',
    sectionId: 'sec-1',
    title: 'Use aspirin daily',
    description: null,
    remark: null,
    rationale: null,
    practicalInfo: null,
    strength: 'STRONG_FOR',
    recommendationType: 'GRADE',
    status: 'DRAFT',
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('RecommendationEditorCard', () => {
  it('renders recommendation title', () => {
    renderWithQuery(<RecommendationEditorCard recommendation={makeRec()} />);
    expect(screen.getByText('Use aspirin daily')).toBeDefined();
  });

  it('shows strength badge', () => {
    renderWithQuery(<RecommendationEditorCard recommendation={makeRec({ strength: 'CONDITIONAL_FOR' })} />);
    expect(screen.getByText('Conditional For')).toBeDefined();
  });

  it('shows type badge', () => {
    renderWithQuery(
      <RecommendationEditorCard recommendation={makeRec({ recommendationType: 'PRACTICE_STATEMENT' })} />,
    );
    expect(screen.getByText('Practice Statement')).toBeDefined();
  });

  it('shows fallback title when no title provided', () => {
    renderWithQuery(<RecommendationEditorCard recommendation={makeRec({ title: null })} />);
    expect(screen.getByText('Untitled recommendation')).toBeDefined();
  });

  it('expands to show narrative editors on click', () => {
    renderWithQuery(<RecommendationEditorCard recommendation={makeRec()} />);
    const header = screen.getByRole('button', { name: /Use aspirin daily/ });
    fireEvent.click(header);
    expect(screen.getByText('Recommendation text')).toBeDefined();
    expect(screen.getByText('Rationale')).toBeDefined();
    expect(screen.getByText('Practical information')).toBeDefined();
  });

  it('collapses narrative editors on second click', () => {
    renderWithQuery(<RecommendationEditorCard recommendation={makeRec()} />);
    const header = screen.getByRole('button', { name: /Use aspirin daily/ });
    fireEvent.click(header);
    expect(screen.getByText('Recommendation text')).toBeDefined();
    fireEvent.click(header);
    expect(screen.queryByText('Recommendation text')).toBeNull();
  });
});
