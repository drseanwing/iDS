/**
 * Performance tests for section tree building logic.
 * Tests mirror the algorithm in SectionsService.findByGuideline.
 */

import { createLargeGuideline, buildTreeFromFlat } from './fixtures/large-guideline';

describe('Section Tree Performance', () => {
  it('should build tree from 200 flat sections in < 100ms', () => {
    const { flatSections } = createLargeGuideline({ sectionCount: 200 });

    const start = performance.now();

    // Mirror the SectionsService tree-building algorithm
    const byId = new Map(flatSections.map((s) => [s.id, { ...s, children: [] as any[] }]));
    const roots: any[] = [];

    for (const section of flatSections) {
      const node = byId.get(section.id)!;
      if (section.parentId && byId.has(section.parentId)) {
        byId.get(section.parentId)!.children.push(node);
      } else if (!section.parentId) {
        roots.push(node);
      }
    }

    const elapsed = performance.now() - start;

    expect(roots.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100);
  });

  it('should handle 500 sections without stack overflow', () => {
    // 500 sections with deep nesting potential
    const { flatSections } = createLargeGuideline({ sectionCount: 500 });

    expect(() => {
      const tree = buildTreeFromFlat(flatSections);

      // Iterative depth traversal to verify no stack overflow
      const stack = [...tree];
      let visited = 0;
      while (stack.length > 0) {
        const node = stack.pop()!;
        visited++;
        if (node.children?.length) {
          stack.push(...node.children);
        }
      }

      expect(visited).toBe(flatSections.length);
    }).not.toThrow();
  });

  it('should paginate root sections correctly from 100 root sections', () => {
    // Create a flat dataset with only root sections (parentId = null)
    const { flatSections } = createLargeGuideline({ sectionCount: 100 });
    const roots = flatSections.filter((s) => s.parentId === null);

    const page = 1;
    const limit = 20;

    const start = performance.now();
    const paginated = roots.slice((page - 1) * limit, page * limit);
    const elapsed = performance.now() - start;

    expect(paginated.length).toBeLessThanOrEqual(limit);
    expect(elapsed).toBeLessThan(10);
  });

  it('should build tree from 50 sections with consistent results', () => {
    const { flatSections, sections } = createLargeGuideline({ sectionCount: 50 });

    // Rebuilt tree should match fixture tree
    const rebuilt = buildTreeFromFlat(flatSections);

    // Same number of root sections
    expect(rebuilt.length).toBe(sections.length);

    // Total node count preserved
    const countNodes = (nodes: any[]): number =>
      nodes.reduce((sum, n) => sum + 1 + countNodes(n.children ?? []), 0);

    expect(countNodes(rebuilt)).toBe(flatSections.length);
  });
});
