import { RecommendationPlanDefinitionProjection } from './recommendation-to-plan-definition';

describe('RecommendationPlanDefinitionProjection', () => {
  let projection: RecommendationPlanDefinitionProjection;

  beforeEach(() => {
    projection = new RecommendationPlanDefinitionProjection();
  });

  // ── Fixtures ─────────────────────────────────────────────────────────────

  const baseRecommendation = {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    title: 'Perform hand hygiene before patient contact',
    description: 'Healthcare workers should perform hand hygiene before touching a patient.',
    rationale: 'Reduces transmission of nosocomial pathogens.',
    recStatus: 'REVIEWED',
    strength: 'STRONG_FOR',
    certaintyOfEvidence: 'HIGH',
    recommendationType: 'STRONG',
    updatedAt: new Date('2023-07-20T12:00:00.000Z'),
    isDeleted: false,
  };

  // ── resourceType ─────────────────────────────────────────────────────────

  it('should produce resourceType PlanDefinition', () => {
    const result: any = projection.toPlanDefinition(baseRecommendation);
    expect(result.resourceType).toBe('PlanDefinition');
  });

  it('should carry the recommendation id', () => {
    const result: any = projection.toPlanDefinition(baseRecommendation);
    expect(result.id).toBe(baseRecommendation.id);
  });

  // ── meta.profile ─────────────────────────────────────────────────────────

  it('should include the PlanDefinition profile URL', () => {
    const result: any = projection.toPlanDefinition(baseRecommendation);
    expect(result.meta.profile).toContain(
      'http://hl7.org/fhir/StructureDefinition/PlanDefinition',
    );
  });

  // ── type coding ──────────────────────────────────────────────────────────

  it('should set type to eca-rule', () => {
    const result: any = projection.toPlanDefinition(baseRecommendation);
    expect(result.type.coding[0].code).toBe('eca-rule');
    expect(result.type.coding[0].system).toBe(
      'http://terminology.hl7.org/CodeSystem/plan-definition-type',
    );
  });

  // ── status mapping ───────────────────────────────────────────────────────

  it('maps REVIEWED to active', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, recStatus: 'REVIEWED' });
    expect(result.status).toBe('active');
  });

  it('maps POSSIBLY_OUTDATED to retired', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, recStatus: 'POSSIBLY_OUTDATED' });
    expect(result.status).toBe('retired');
  });

  it.each(['NEW', 'UPDATED', 'IN_REVIEW', 'UPDATED_EVIDENCE'])(
    'maps %s to draft',
    (recStatus) => {
      const result: any = projection.toPlanDefinition({ ...baseRecommendation, recStatus });
      expect(result.status).toBe('draft');
    },
  );

  it('maps unknown recStatus to unknown', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, recStatus: 'SOMETHING_ELSE' });
    expect(result.status).toBe('unknown');
  });

  // ── title ────────────────────────────────────────────────────────────────

  it('should map recommendation title', () => {
    const result: any = projection.toPlanDefinition(baseRecommendation);
    expect(result.title).toBe(baseRecommendation.title);
  });

  it('should produce undefined title when title is null', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, title: null });
    expect(result.title).toBeUndefined();
  });

  // ── description ──────────────────────────────────────────────────────────

  it('should pass string description through', () => {
    const result: any = projection.toPlanDefinition(baseRecommendation);
    expect(result.description).toBe(baseRecommendation.description);
  });

  it('should JSON.stringify object description', () => {
    const desc = { text: 'complex', nested: true };
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, description: desc });
    expect(result.description).toBe(JSON.stringify(desc));
  });

  it('should omit description when null', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, description: null });
    expect(result.description).toBeUndefined();
  });

  // ── date ─────────────────────────────────────────────────────────────────

  it('should convert updatedAt Date to ISO string', () => {
    const result: any = projection.toPlanDefinition(baseRecommendation);
    expect(result.date).toBe('2023-07-20T12:00:00.000Z');
  });

  // ── strength extension ───────────────────────────────────────────────────

  it('should include strength extension for STRONG_FOR', () => {
    const result: any = projection.toPlanDefinition(baseRecommendation);
    const ext = result.extension.find(
      (e: any) => e.url === 'http://hl7.org/fhir/StructureDefinition/cqf-strengthOfRecommendation',
    );
    expect(ext).toBeDefined();
    expect(ext.valueCodeableConcept.coding[0].code).toBe('STRONG_FOR');
    expect(ext.valueCodeableConcept.coding[0].display).toBe('Strong recommendation for');
  });

  it('should map CONDITIONAL_FOR strength display correctly', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, strength: 'CONDITIONAL_FOR' });
    const ext = result.extension.find(
      (e: any) => e.url === 'http://hl7.org/fhir/StructureDefinition/cqf-strengthOfRecommendation',
    );
    expect(ext.valueCodeableConcept.coding[0].display).toBe('Conditional recommendation for');
  });

  it('should map CONDITIONAL_AGAINST strength display correctly', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, strength: 'CONDITIONAL_AGAINST' });
    const ext = result.extension.find(
      (e: any) => e.url === 'http://hl7.org/fhir/StructureDefinition/cqf-strengthOfRecommendation',
    );
    expect(ext.valueCodeableConcept.coding[0].display).toBe('Conditional recommendation against');
  });

  it('should map STRONG_AGAINST strength display correctly', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, strength: 'STRONG_AGAINST' });
    const ext = result.extension.find(
      (e: any) => e.url === 'http://hl7.org/fhir/StructureDefinition/cqf-strengthOfRecommendation',
    );
    expect(ext.valueCodeableConcept.coding[0].display).toBe('Strong recommendation against');
  });

  it('should omit strength extension when strength is NOT_SET', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, strength: 'NOT_SET' });
    const ext = (result.extension ?? []).find(
      (e: any) => e.url === 'http://hl7.org/fhir/StructureDefinition/cqf-strengthOfRecommendation',
    );
    expect(ext).toBeUndefined();
  });

  it('should omit strength extension when strength is null', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, strength: null });
    const ext = (result.extension ?? []).find(
      (e: any) => e.url === 'http://hl7.org/fhir/StructureDefinition/cqf-strengthOfRecommendation',
    );
    expect(ext).toBeUndefined();
  });

  // ── certaintyOfEvidence extension ────────────────────────────────────────

  it('should include quality-of-evidence extension for HIGH certainty', () => {
    const result: any = projection.toPlanDefinition(baseRecommendation);
    const ext = result.extension.find(
      (e: any) => e.url === 'http://hl7.org/fhir/StructureDefinition/cqf-qualityOfEvidence',
    );
    expect(ext).toBeDefined();
    expect(ext.valueCodeableConcept.coding[0].code).toBe('high');
    expect(ext.valueCodeableConcept.coding[0].display).toBe('HIGH');
  });

  it.each([
    ['HIGH', 'high'],
    ['MODERATE', 'moderate'],
    ['LOW', 'low'],
    ['VERY_LOW', 'very-low'],
  ])('maps certaintyOfEvidence %s to code %s', (certainty, expectedCode) => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, certaintyOfEvidence: certainty });
    const ext = result.extension.find(
      (e: any) => e.url === 'http://hl7.org/fhir/StructureDefinition/cqf-qualityOfEvidence',
    );
    expect(ext.valueCodeableConcept.coding[0].code).toBe(expectedCode);
  });

  it('should omit quality-of-evidence extension when certaintyOfEvidence is null', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, certaintyOfEvidence: null });
    const ext = (result.extension ?? []).find(
      (e: any) => e.url === 'http://hl7.org/fhir/StructureDefinition/cqf-qualityOfEvidence',
    );
    expect(ext).toBeUndefined();
  });

  // ── extension array absent when no extensions apply ──────────────────────

  it('should have no extension property when strength is NOT_SET and certainty is null', () => {
    const result: any = projection.toPlanDefinition({
      ...baseRecommendation,
      strength: 'NOT_SET',
      certaintyOfEvidence: null,
    });
    expect(result.extension).toBeUndefined();
  });

  // ── useContext (recommendationType) ──────────────────────────────────────

  it('should include useContext when recommendationType is present', () => {
    const result: any = projection.toPlanDefinition(baseRecommendation);
    expect(result.useContext).toHaveLength(1);
    expect(result.useContext[0].valueCodeableConcept.coding[0].code).toBe('STRONG');
  });

  it('should omit useContext when recommendationType is null', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, recommendationType: null });
    expect(result.useContext).toBeUndefined();
  });

  // ── rationale / purpose ──────────────────────────────────────────────────

  it('should map string rationale to purpose', () => {
    const result: any = projection.toPlanDefinition(baseRecommendation);
    expect(result.purpose).toBe(baseRecommendation.rationale);
  });

  it('should JSON.stringify object rationale', () => {
    const rationale = { text: 'complex rationale' };
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, rationale });
    expect(result.purpose).toBe(JSON.stringify(rationale));
  });

  it('should omit purpose when rationale is null', () => {
    const result: any = projection.toPlanDefinition({ ...baseRecommendation, rationale: null });
    expect(result.purpose).toBeUndefined();
  });
});
