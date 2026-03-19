import { GuidelineCompositionProjection } from './guideline-to-composition';

describe('GuidelineCompositionProjection', () => {
  let projection: GuidelineCompositionProjection;

  beforeEach(() => {
    projection = new GuidelineCompositionProjection();
  });

  // ── Fixtures ─────────────────────────────────────────────────────────────

  const baseGuideline = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    title: 'WHO Guidelines on Hand Hygiene in Health Care',
    shortName: 'who-hand-hygiene-2009',
    description: 'Evidence-based recommendations for hand hygiene in health care settings.',
    status: 'PUBLISHED',
    updatedAt: new Date('2023-06-15T10:00:00.000Z'),
    isDeleted: false,
    sections: [
      {
        id: 'sec-1',
        title: 'Background',
        text: 'Hand hygiene is the single most important measure to reduce healthcare-associated infections.',
        ordering: 1,
        parentId: null,
        isDeleted: false,
      },
      {
        id: 'sec-2',
        title: 'Recommendations',
        text: null,
        ordering: 2,
        parentId: null,
        isDeleted: false,
      },
      {
        id: 'sec-2-1',
        title: 'When to perform hand hygiene',
        text: 'Hand hygiene must be performed at five moments.',
        ordering: 1,
        parentId: 'sec-2',
        isDeleted: false,
      },
      {
        id: 'sec-deleted',
        title: 'Deleted section',
        text: 'This should not appear.',
        ordering: 3,
        parentId: null,
        isDeleted: true,
      },
    ],
  };

  // ── resourceType ─────────────────────────────────────────────────────────

  it('should produce resourceType Composition', () => {
    const result: any = projection.toComposition(baseGuideline);
    expect(result.resourceType).toBe('Composition');
  });

  it('should carry the guideline id', () => {
    const result: any = projection.toComposition(baseGuideline);
    expect(result.id).toBe(baseGuideline.id);
  });

  // ── meta.profile ─────────────────────────────────────────────────────────

  it('should include the CPG Composition profile URL', () => {
    const result: any = projection.toComposition(baseGuideline);
    expect(result.meta.profile).toContain(
      'http://hl7.org/fhir/StructureDefinition/Composition',
    );
  });

  // ── status mapping ───────────────────────────────────────────────────────

  it('maps PUBLISHED status to final', () => {
    const result: any = projection.toComposition({ ...baseGuideline, status: 'PUBLISHED' });
    expect(result.status).toBe('final');
  });

  it('maps PUBLIC_CONSULTATION status to amended', () => {
    const result: any = projection.toComposition({ ...baseGuideline, status: 'PUBLIC_CONSULTATION' });
    expect(result.status).toBe('amended');
  });

  it('maps PUBLISHED_INTERNAL status to amended', () => {
    const result: any = projection.toComposition({ ...baseGuideline, status: 'PUBLISHED_INTERNAL' });
    expect(result.status).toBe('amended');
  });

  it('maps unknown status to preliminary', () => {
    const result: any = projection.toComposition({ ...baseGuideline, status: 'DRAFT' });
    expect(result.status).toBe('preliminary');
  });

  // ── type coding ──────────────────────────────────────────────────────────

  it('should include LOINC 57024-2 type coding', () => {
    const result: any = projection.toComposition(baseGuideline);
    expect(result.type.coding[0].system).toBe('http://loinc.org');
    expect(result.type.coding[0].code).toBe('57024-2');
  });

  // ── title ────────────────────────────────────────────────────────────────

  it('should map guideline title to Composition title', () => {
    const result: any = projection.toComposition(baseGuideline);
    expect(result.title).toBe(baseGuideline.title);
  });

  // ── date ─────────────────────────────────────────────────────────────────

  it('should convert updatedAt Date object to ISO string', () => {
    const result: any = projection.toComposition(baseGuideline);
    expect(result.date).toBe('2023-06-15T10:00:00.000Z');
  });

  it('should pass through updatedAt string as-is', () => {
    const result: any = projection.toComposition({ ...baseGuideline, updatedAt: '2023-06-15' });
    expect(result.date).toBe('2023-06-15');
  });

  // ── identifier (shortName) ───────────────────────────────────────────────

  it('should include identifier when shortName is present', () => {
    const result: any = projection.toComposition(baseGuideline);
    expect(result.identifier).toEqual([
      { system: 'urn:opengrade:guideline:slug', value: 'who-hand-hygiene-2009' },
    ]);
  });

  it('should omit identifier when shortName is absent', () => {
    const result: any = projection.toComposition({ ...baseGuideline, shortName: null });
    expect(result.identifier).toBeUndefined();
  });

  // ── subject (description) ────────────────────────────────────────────────

  it('should include subject when description is present', () => {
    const result: any = projection.toComposition(baseGuideline);
    expect(result.subject).toEqual([{ display: baseGuideline.description }]);
  });

  it('should omit subject when description is absent', () => {
    const result: any = projection.toComposition({ ...baseGuideline, description: null });
    expect(result.subject).toBeUndefined();
  });

  // ── sections mapping ─────────────────────────────────────────────────────

  it('should only include root-level (non-deleted) sections at top level', () => {
    const result: any = projection.toComposition(baseGuideline);
    // sec-deleted is isDeleted=true, sec-2-1 has a parentId — neither should appear at root
    expect(result.section).toHaveLength(2);
    const titles = result.section.map((s: any) => s.title);
    expect(titles).toContain('Background');
    expect(titles).toContain('Recommendations');
  });

  it('should order root sections by ordering field', () => {
    const result: any = projection.toComposition(baseGuideline);
    expect(result.section[0].title).toBe('Background');
    expect(result.section[1].title).toBe('Recommendations');
  });

  it('should nest child sections under their parent', () => {
    const result: any = projection.toComposition(baseGuideline);
    const recommendations = result.section.find((s: any) => s.title === 'Recommendations');
    expect(recommendations.section).toHaveLength(1);
    expect(recommendations.section[0].title).toBe('When to perform hand hygiene');
  });

  it('should map section text to FHIR Narrative with generated status', () => {
    const result: any = projection.toComposition(baseGuideline);
    const background = result.section.find((s: any) => s.title === 'Background');
    expect(background.text.status).toBe('generated');
    expect(background.text.div).toBe(
      'Hand hygiene is the single most important measure to reduce healthcare-associated infections.',
    );
  });

  it('should omit text property when section.text is null', () => {
    const result: any = projection.toComposition(baseGuideline);
    const recommendations = result.section.find((s: any) => s.title === 'Recommendations');
    expect(recommendations.text).toBeUndefined();
  });

  it('should wrap non-string section text in an xhtml div', () => {
    const objectText = { key: 'value' };
    const guideline = {
      ...baseGuideline,
      sections: [
        { id: 's1', title: 'Intro', text: objectText, ordering: 1, parentId: null, isDeleted: false },
      ],
    };
    const result: any = projection.toComposition(guideline);
    expect(result.section[0].text.div).toContain('<div xmlns="http://www.w3.org/1999/xhtml">');
  });

  it('should return an empty section array when guideline has no sections', () => {
    const result: any = projection.toComposition({ ...baseGuideline, sections: [] });
    expect(result.section).toEqual([]);
  });

  it('should handle missing sections property gracefully', () => {
    const { sections: _sections, ...guidelineWithoutSections } = baseGuideline;
    const result: any = projection.toComposition(guidelineWithoutSections);
    expect(result.section).toEqual([]);
  });
});
