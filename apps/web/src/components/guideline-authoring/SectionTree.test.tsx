import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionTree } from './SectionTree';
import type { Section } from '../../hooks/useSections';

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

describe('SectionTree', () => {
  it('renders section titles', () => {
    const sections = [
      makeSection({ id: 'sec-1', title: 'Introduction' }),
      makeSection({ id: 'sec-2', title: 'Background', ordering: 1 }),
    ];
    render(
      <SectionTree sections={sections} selectedId={null} onSelect={() => {}} />,
    );
    expect(screen.getByText('Introduction')).toBeDefined();
    expect(screen.getByText('Background')).toBeDefined();
  });

  it('calls onSelect when a section is clicked', () => {
    let selected: string | null = null;
    const sections = [makeSection({ id: 'sec-1', title: 'Methods' })];
    render(
      <SectionTree
        sections={sections}
        selectedId={null}
        onSelect={(id) => {
          selected = id;
        }}
      />,
    );
    fireEvent.click(screen.getByText('Methods'));
    expect(selected).toBe('sec-1');
  });

  it('highlights the selected section', () => {
    const sections = [makeSection({ id: 'sec-1', title: 'Results' })];
    render(
      <SectionTree sections={sections} selectedId="sec-1" onSelect={() => {}} />,
    );
    const btn = screen.getByRole('button', { name: /Results/ });
    expect(btn.className).toContain('bg-accent');
  });

  it('shows empty state when no sections', () => {
    render(<SectionTree sections={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/No sections yet/)).toBeDefined();
  });

  it('renders nested child sections', () => {
    const child = makeSection({ id: 'sec-child', title: 'Child Section', parentId: 'sec-1' });
    const parent = makeSection({ id: 'sec-1', title: 'Parent Section', children: [child] });
    render(
      <SectionTree sections={[parent]} selectedId={null} onSelect={() => {}} />,
    );
    expect(screen.getByText('Parent Section')).toBeDefined();
    expect(screen.getByText('Child Section')).toBeDefined();
  });

  it('only shows root sections at top level (filters by parentId)', () => {
    const child = makeSection({ id: 'sec-child', title: 'Child Section', parentId: 'sec-1' });
    const parent = makeSection({ id: 'sec-1', title: 'Parent Section', children: [child] });
    // child appears in `sections` array but also as a nested child; should not show twice
    render(
      <SectionTree sections={[parent, child]} selectedId={null} onSelect={() => {}} />,
    );
    const items = screen.getAllByText('Child Section');
    expect(items.length).toBe(1);
  });
});
