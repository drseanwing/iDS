/**
 * Factory helpers for generating large mock guideline data for performance tests.
 */

export interface MockOutcome {
  id: string;
  name: string;
  importance: string;
  certaintyOfEvidence: string;
  effectEstimate: string;
  participantCount: number;
  studyCount: number;
}

export interface MockPico {
  id: string;
  population: string;
  intervention: string;
  comparator: string;
  setting: string;
  narrativeSummary: any;
  outcomes: MockOutcome[];
}

export interface MockRecommendation {
  id: string;
  title: string;
  strength: string;
  direction: string;
  remark: any;
  rationale: any;
  sectionPlacements: any[];
}

export interface MockSection {
  id: string;
  guidelineId: string;
  title: string;
  ordering: number;
  parentId: string | null;
  isDeleted: boolean;
  excludeFromNumbering: boolean;
  text: string | null;
  content?: any;
  sectionRecommendations: Array<{ recommendationId: string }>;
  sectionPicos: Array<{ picoId: string }>;
  sectionReferences: any[];
  children: MockSection[];
}

export interface LargeGuideline {
  guideline: {
    id: string;
    title: string;
    shortName: string;
    description: string;
    showSectionNumbers: boolean;
    pdfColumnLayout: number;
    picoDisplayMode: string;
  };
  organization: { name: string; logoUrl: string | null };
  flatSections: Omit<MockSection, 'children'>[];
  sections: MockSection[];
  recommendations: MockRecommendation[];
  picos: MockPico[];
  references: Array<{
    id: string;
    title: string;
    authors: string;
    year: number;
    journal: string;
    doi: string;
  }>;
}

let idCounter = 0;
function nextId(prefix = 'id'): string {
  return `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeTipTapContent(text: string): any {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
}

function makeOutcome(index: number): MockOutcome {
  return {
    id: nextId('outcome'),
    name: `Outcome ${index}`,
    importance: index % 3 === 0 ? 'CRITICAL' : index % 3 === 1 ? 'IMPORTANT' : 'NOT_IMPORTANT',
    certaintyOfEvidence: ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'][index % 4],
    effectEstimate: `RR ${(0.5 + index * 0.1).toFixed(2)} (95% CI 0.3–1.5)`,
    participantCount: 100 + index * 50,
    studyCount: 1 + (index % 5),
  };
}

function makePico(index: number, outcomesPerPico: number): MockPico {
  return {
    id: nextId('pico'),
    population: `Adults with condition ${index}`,
    intervention: `Intervention ${index}`,
    comparator: `Placebo or standard care`,
    setting: `Hospital setting ${index % 3}`,
    narrativeSummary: makeTipTapContent(`Narrative summary for PICO ${index}`),
    outcomes: Array.from({ length: outcomesPerPico }, (_, i) => makeOutcome(i)),
  };
}

function makeRecommendation(index: number, picoIds: string[]): MockRecommendation {
  return {
    id: nextId('rec'),
    title: `Recommendation ${index}: We recommend intervention ${index} for eligible patients`,
    strength: index % 2 === 0 ? 'STRONG' : 'CONDITIONAL',
    direction: index % 3 === 0 ? 'AGAINST' : 'FOR',
    remark: makeTipTapContent(`Remark for recommendation ${index}`),
    rationale: makeTipTapContent(`Rationale text for recommendation ${index}`),
    sectionPlacements: [],
  };
}

function makeSection(
  index: number,
  guidelineId: string,
  parentId: string | null,
  recIds: string[],
  picoIds: string[],
): Omit<MockSection, 'children'> {
  const id = nextId('section');
  return {
    id,
    guidelineId,
    title: `Section ${index}: ${parentId ? 'Subsection' : 'Root section'} ${index}`,
    ordering: index,
    parentId,
    isDeleted: false,
    excludeFromNumbering: false,
    text: null,
    content: makeTipTapContent(`Content of section ${index}. `.repeat(3)),
    sectionRecommendations: recIds.length ? [{ recommendationId: recIds[index % recIds.length] }] : [],
    sectionPicos: picoIds.length ? [{ picoId: picoIds[index % picoIds.length] }] : [],
    sectionReferences: [],
  };
}

/**
 * Build a tree structure from flat sections (mirrors SectionsService.findByGuideline logic).
 */
export function buildTreeFromFlat(
  flatSections: Omit<MockSection, 'children'>[],
): MockSection[] {
  const byId = new Map(
    flatSections.map((s) => [s.id, { ...s, children: [] as MockSection[] }]),
  );
  const roots: MockSection[] = [];

  for (const section of flatSections) {
    const node = byId.get(section.id)!;
    if (section.parentId && byId.has(section.parentId)) {
      byId.get(section.parentId)!.children.push(node);
    } else if (!section.parentId) {
      roots.push(node);
    }
  }

  return roots;
}

export interface LargeGuidelineOptions {
  sectionCount?: number;
  recsPerSection?: number;
  outcomesPerPico?: number;
}

/**
 * Creates a large mock guideline for performance testing.
 */
export function createLargeGuideline(options: LargeGuidelineOptions = {}): LargeGuideline {
  idCounter = 0; // Reset for reproducibility

  const { sectionCount = 50, recsPerSection = 2, outcomesPerPico = 5 } = options;

  const guidelineId = nextId('guideline');

  // Build recommendations
  const picoCount = Math.max(1, Math.floor(sectionCount / 5));
  const recCount = Math.max(1, Math.floor(sectionCount * recsPerSection));

  const picos: MockPico[] = Array.from({ length: picoCount }, (_, i) =>
    makePico(i, outcomesPerPico),
  );
  const picoIds = picos.map((p) => p.id);

  const recommendations: MockRecommendation[] = Array.from({ length: recCount }, (_, i) =>
    makeRecommendation(i, picoIds),
  );
  const recIds = recommendations.map((r) => r.id);

  // Build sections: first 20% are root sections, rest are children
  const rootCount = Math.max(1, Math.floor(sectionCount * 0.2));
  const flatSections: Omit<MockSection, 'children'>[] = [];
  const rootIds: string[] = [];

  for (let i = 0; i < sectionCount; i++) {
    const isRoot = i < rootCount;
    const parentId = isRoot
      ? null
      : rootIds[i % rootIds.length];

    const section = makeSection(i, guidelineId, parentId, recIds, picoIds);
    flatSections.push(section);

    if (isRoot) {
      rootIds.push(section.id);
    }
  }

  const sections = buildTreeFromFlat(flatSections);

  const references = Array.from({ length: Math.max(5, Math.floor(sectionCount / 3)) }, (_, i) => ({
    id: nextId('ref'),
    title: `Reference ${i}: A study on intervention ${i}`,
    authors: `Author ${i} et al.`,
    year: 2015 + (i % 10),
    journal: `Journal of Medicine ${i % 5}`,
    doi: `10.1000/xyz${i}`,
  }));

  return {
    guideline: {
      id: guidelineId,
      title: `Large Performance Test Guideline (${sectionCount} sections)`,
      shortName: `PerfTest-${sectionCount}`,
      description: 'Auto-generated guideline for performance testing',
      showSectionNumbers: true,
      pdfColumnLayout: 1,
      picoDisplayMode: 'INLINE',
    },
    organization: { name: 'Test Organization', logoUrl: null },
    flatSections,
    sections,
    recommendations,
    picos,
    references,
  };
}
