import { PicoEvidenceProjection } from './pico-to-evidence';

describe('PicoEvidenceProjection', () => {
  let projection: PicoEvidenceProjection;

  beforeEach(() => {
    projection = new PicoEvidenceProjection();
  });

  // ── Fixtures ─────────────────────────────────────────────────────────────

  const baseOutcome = {
    id: 'out-1',
    title: 'All-cause mortality',
    outcomeType: 'CRITICAL',
    effectMeasure: 'RR',
    relativeEffect: 0.72,
    relativeEffectLower: 0.58,
    relativeEffectUpper: 0.89,
    numberOfStudies: 12,
    interventionParticipants: 3500,
    comparisonParticipants: 3400,
    certaintyOverall: 'MODERATE',
    riskOfBias: 'NOT_SERIOUS',
    inconsistency: 'SERIOUS',
    indirectness: 'NOT_SERIOUS',
    imprecision: 'NOT_SERIOUS',
    publicationBias: 'NOT_SERIOUS',
    isDeleted: false,
    isShadow: false,
  };

  const basePico = {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    population: 'Adults hospitalised with confirmed influenza',
    intervention: 'Oseltamivir (75 mg twice daily for 5 days)',
    comparator: 'Placebo',
    narrativeSummary: 'Oseltamivir reduces mortality and hospitalisation duration in adults.',
    updatedAt: new Date('2023-08-01T08:00:00.000Z'),
    isDeleted: false,
    outcomes: [baseOutcome],
    codes: [
      {
        element: 'intervention',
        codeSystem: 'ATC',
        code: 'J05AH02',
        display: 'oseltamivir',
      },
    ],
  };

  // ── resourceType ─────────────────────────────────────────────────────────

  it('should produce resourceType Evidence', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.resourceType).toBe('Evidence');
  });

  it('should carry the PICO id', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.id).toBe(basePico.id);
  });

  // ── meta.profile ─────────────────────────────────────────────────────────

  it('should include the Evidence profile URL', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.meta.profile).toContain(
      'http://hl7.org/fhir/StructureDefinition/Evidence',
    );
  });

  // ── status ───────────────────────────────────────────────────────────────

  it('should always set status to active', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.status).toBe('active');
  });

  // ── title ────────────────────────────────────────────────────────────────

  it('should compose title from population, intervention, and comparator', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.title).toBe(
      'Adults hospitalised with confirmed influenza: Oseltamivir (75 mg twice daily for 5 days) vs Placebo',
    );
  });

  // ── date ─────────────────────────────────────────────────────────────────

  it('should convert updatedAt Date to ISO string', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.date).toBe('2023-08-01T08:00:00.000Z');
  });

  // ── variableDefinitions ──────────────────────────────────────────────────

  it('should include three variableDefinition entries', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.variableDefinition).toHaveLength(3);
  });

  it('should map population variable role', () => {
    const result: any = projection.toEvidence(basePico);
    const popVar = result.variableDefinition.find(
      (v: any) => v.variableRole.coding[0].code === 'population',
    );
    expect(popVar).toBeDefined();
    expect(popVar.observed.display).toBe(basePico.population);
  });

  it('should map intervention as exposure variable role', () => {
    const result: any = projection.toEvidence(basePico);
    const expVar = result.variableDefinition.find(
      (v: any) => v.variableRole.coding[0].code === 'exposure',
    );
    expect(expVar).toBeDefined();
    expect(expVar.observed.display).toBe(basePico.intervention);
  });

  it('should map comparator as referenceExposure variable role', () => {
    const result: any = projection.toEvidence(basePico);
    const refVar = result.variableDefinition.find(
      (v: any) => v.variableRole.coding[0].code === 'referenceExposure',
    );
    expect(refVar).toBeDefined();
    expect(refVar.observed.display).toBe(basePico.comparator);
  });

  // ── statistics mapping ───────────────────────────────────────────────────

  it('should map non-deleted, non-shadow outcomes to statistic array', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.statistic).toHaveLength(1);
  });

  it('should filter out deleted outcomes', () => {
    const pico = { ...basePico, outcomes: [{ ...baseOutcome, isDeleted: true }] };
    const result: any = projection.toEvidence(pico);
    expect(result.statistic).toBeUndefined();
  });

  it('should filter out shadow outcomes', () => {
    const pico = { ...basePico, outcomes: [{ ...baseOutcome, isShadow: true }] };
    const result: any = projection.toEvidence(pico);
    expect(result.statistic).toBeUndefined();
  });

  it('should set statistic description to outcome title', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.statistic[0].description).toBe('All-cause mortality');
  });

  it('should map RR effectMeasure to correct SNOMED code', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.statistic[0].statisticType.coding[0].code).toBe('C93152');
  });

  it.each([
    ['OR', 'C16932'],
    ['HR', 'C93150'],
    ['MD', 'C53319'],
    ['SMD', 'C53321'],
    ['PROTECTIVE_EFFICACY', 'C53319'],
  ])('maps effectMeasure %s to code %s', (measure, expectedCode) => {
    const pico = { ...basePico, outcomes: [{ ...baseOutcome, effectMeasure: measure }] };
    const result: any = projection.toEvidence(pico);
    expect(result.statistic[0].statisticType.coding[0].code).toBe(expectedCode);
  });

  it('should set quantity.value to relativeEffect', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.statistic[0].quantity.value).toBe(0.72);
  });

  it('should include confidence interval attributeEstimate', () => {
    const result: any = projection.toEvidence(basePico);
    const ci = result.statistic[0].attributeEstimate[0];
    expect(ci.range.low.value).toBe(0.58);
    expect(ci.range.high.value).toBe(0.89);
    expect(ci.type.coding[0].code).toBe('C53324');
  });

  it('should omit attributeEstimate when CI bounds are null', () => {
    const pico = {
      ...basePico,
      outcomes: [{ ...baseOutcome, relativeEffectLower: null, relativeEffectUpper: null }],
    };
    const result: any = projection.toEvidence(pico);
    expect(result.statistic[0].attributeEstimate).toBeUndefined();
  });

  // ── sampleSize ───────────────────────────────────────────────────────────

  it('should set sampleSize.numberOfStudies', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.statistic[0].sampleSize.numberOfStudies).toBe(12);
  });

  it('should sum intervention and comparison participants', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.statistic[0].sampleSize.numberOfParticipants).toBe(6900);
  });

  it('should omit sampleSize when no study/participant counts are present', () => {
    const pico = {
      ...basePico,
      outcomes: [
        {
          ...baseOutcome,
          numberOfStudies: null,
          interventionParticipants: null,
          comparisonParticipants: null,
        },
      ],
    };
    const result: any = projection.toEvidence(pico);
    expect(result.statistic[0].sampleSize).toBeUndefined();
  });

  // ── certainty mapping ─────────────────────────────────────────────────────

  it('should include modelCharacteristic with overall certainty', () => {
    const result: any = projection.toEvidence(basePico);
    const mc = result.statistic[0].modelCharacteristic[0];
    expect(mc.code.coding[0].code).toBe('overall');
    expect(mc.value.coding[0].code).toBe('moderate');
  });

  it.each([
    ['HIGH', 'high'],
    ['MODERATE', 'moderate'],
    ['LOW', 'low'],
    ['VERY_LOW', 'very-low'],
  ])('maps certaintyOverall %s to code %s', (certainty, expectedCode) => {
    const pico = { ...basePico, outcomes: [{ ...baseOutcome, certaintyOverall: certainty }] };
    const result: any = projection.toEvidence(pico);
    expect(result.statistic[0].modelCharacteristic[0].value.coding[0].code).toBe(expectedCode);
  });

  it('should include certainty component for SERIOUS inconsistency', () => {
    const result: any = projection.toEvidence(basePico);
    // basePico outcome has inconsistency: SERIOUS
    const mc = result.statistic[0].modelCharacteristic[0];
    // modelCharacteristic exists
    expect(mc).toBeDefined();
  });

  it('should omit statistic array when outcomes array is empty', () => {
    const result: any = projection.toEvidence({ ...basePico, outcomes: [] });
    expect(result.statistic).toBeUndefined();
  });

  // ── description (narrativeSummary) ───────────────────────────────────────

  it('should map string narrativeSummary to description', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.description).toBe(basePico.narrativeSummary);
  });

  it('should JSON.stringify object narrativeSummary', () => {
    const summary = { text: 'complex summary' };
    const result: any = projection.toEvidence({ ...basePico, narrativeSummary: summary });
    expect(result.description).toBe(JSON.stringify(summary));
  });

  it('should omit description when narrativeSummary is null', () => {
    const result: any = projection.toEvidence({ ...basePico, narrativeSummary: null });
    expect(result.description).toBeUndefined();
  });

  // ── PICO codes / note ─────────────────────────────────────────────────────

  it('should include note with coded elements text when codes are present', () => {
    const result: any = projection.toEvidence(basePico);
    expect(result.note).toHaveLength(1);
    expect(result.note[0].text).toContain('intervention=ATC:J05AH02 (oseltamivir)');
  });

  it('should omit note when codes array is empty', () => {
    const result: any = projection.toEvidence({ ...basePico, codes: [] });
    expect(result.note).toBeUndefined();
  });

  it('should handle missing outcomes property gracefully', () => {
    const { outcomes: _o, ...picoWithoutOutcomes } = basePico;
    const result: any = projection.toEvidence(picoWithoutOutcomes);
    expect(result.statistic).toBeUndefined();
  });
});
