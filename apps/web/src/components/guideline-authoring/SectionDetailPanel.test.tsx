import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionDetailPanel } from './SectionDetailPanel';
import type { Section } from '../../hooks/useSections';
import type { Recommendation } from '../../hooks/useRecommendations';

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

function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: 'rec-1',
    guidelineId: 'gl-1',
    sectionId: 'sec-1',
    title: 'Test recommendation',
    description: null,
    strength: 'STRONG_FOR',
    recommendationType: 'GRADE',
    status: 'DRAFT',
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('SectionDetailPanel', () => {
  it('shows empty state when no section is selected', () => {
    render(<SectionDetailPanel section={null} recommendations={[]} />);
    expect(screen.getByText(/Select a section/)).toBeDefined();
  });

  it('shows section title when section is provided', () => {
    const section = makeSection({ title: 'Methods' });
    render(<SectionDetailPanel section={section} recommendations={[]} />);
    expect(screen.getByText('Methods')).toBeDefined();
  });

  it('shows linked recommendations', () => {
    const section = makeSection({ id: 'sec-1' });
    const rec = makeRecommendation({ sectionId: 'sec-1', title: 'Use aspirin' });
    render(<SectionDetailPanel section={section} recommendations={[rec]} />);
    expect(screen.getByText('Use aspirin')).toBeDefined();
  });

  it('does not show recommendations from other sections', () => {
    const section = makeSection({ id: 'sec-1' });
    const rec = makeRecommendation({ sectionId: 'sec-other', title: 'Other rec' });
    render(<SectionDetailPanel section={section} recommendations={[rec]} />);
    expect(screen.queryByText('Other rec')).toBeNull();
  });

  it('shows strength badge for recommendation', () => {
    const section = makeSection({ id: 'sec-1' });
    const rec = makeRecommendation({ sectionId: 'sec-1', strength: 'CONDITIONAL_AGAINST' });
    render(<SectionDetailPanel section={section} recommendations={[rec]} />);
    expect(screen.getByText('Conditional Against')).toBeDefined();
  });

  it('shows excluded from numbering badge', () => {
    const section = makeSection({ excludeFromNumbering: true });
    render(<SectionDetailPanel section={section} recommendations={[]} />);
    expect(screen.getByText('Excluded from numbering')).toBeDefined();
  });

  it('shows child sections count', () => {
    const child = makeSection({ id: 'sec-child', title: 'Sub-section A', parentId: 'sec-1' });
    const section = makeSection({ id: 'sec-1', children: [child] });
    render(<SectionDetailPanel section={section} recommendations={[]} />);
    expect(screen.getByText(/Sub-sections \(1\)/)).toBeDefined();
    expect(screen.getByText('Sub-section A')).toBeDefined();
  });
});
