import { coiToProvenance } from './coi-to-provenance';

describe('coiToProvenance', () => {
  // ── Fixtures ─────────────────────────────────────────────────────────────

  const baseConflict = {
    id: 'conflict-1',
    coiRecordId: 'coi-record-uuid-1234-5678-abcd-ef1234567890',
    interventionLabel: 'Drug A',
    conflictLevel: 'LOW' as const,
    excludeFromVoting: false,
    internalComment: null,
    isPublic: true,
  };

  const baseRecord = {
    id: 'coi-record-uuid-1234-5678-abcd-ef1234567890',
    guidelineId: 'guideline-uuid-1234-5678-abcd-ef1234567890',
    userId: 'user-uuid-1234-5678-abcd-ef1234567890',
    publicSummary: 'No significant conflicts of interest.',
    internalSummary: null,
    updatedAt: new Date('2024-03-10T12:00:00.000Z'),
    user: { id: 'user-uuid-1234-5678-abcd-ef1234567890', displayName: 'Dr. Jane Smith', email: 'jane@example.com' },
    interventionConflicts: [baseConflict],
  };

  // ── resourceType ─────────────────────────────────────────────────────────

  it('should produce resourceType Provenance', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.resourceType).toBe('Provenance');
  });

  it('should carry the CoiRecord id', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.id).toBe(baseRecord.id);
  });

  // ── meta ─────────────────────────────────────────────────────────────────

  it('should include the Provenance profile URL', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.meta.profile).toContain(
      'http://hl7.org/fhir/StructureDefinition/Provenance',
    );
  });

  it('should set lastUpdated from updatedAt', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.meta.lastUpdated).toBe('2024-03-10T12:00:00.000Z');
  });

  // ── target ───────────────────────────────────────────────────────────────

  it('should set target reference to Composition/guidelineId', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.target).toEqual([
      { reference: `Composition/${baseRecord.guidelineId}` },
    ]);
  });

  // ── recorded ─────────────────────────────────────────────────────────────

  it('should set recorded from updatedAt ISO string', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.recorded).toBe('2024-03-10T12:00:00.000Z');
  });

  // ── agent ────────────────────────────────────────────────────────────────

  it('should include exactly one agent', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.agent).toHaveLength(1);
  });

  it('should set agent.who.reference to Practitioner/userId', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.agent[0].who.reference).toBe(`Practitioner/${baseRecord.userId}`);
  });

  it('should set agent.who.display from user.displayName', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.agent[0].who.display).toBe('Dr. Jane Smith');
  });

  it('should fall back agent.who.display to userId when user is absent', () => {
    const record = { ...baseRecord, user: undefined };
    const result: any = coiToProvenance(record);
    expect(result.agent[0].who.display).toBe(baseRecord.userId);
  });

  it('should set agent type coding to author', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.agent[0].type.coding[0].code).toBe('author');
    expect(result.agent[0].type.coding[0].system).toBe(
      'http://terminology.hl7.org/CodeSystem/provenance-participant-type',
    );
  });

  // ── entity (intervention conflicts) ──────────────────────────────────────

  it('should map intervention conflicts to entity array', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.entity).toHaveLength(1);
  });

  it('should set entity role to source', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.entity[0].role).toBe('source');
  });

  it('should set entity.what.display from interventionLabel', () => {
    const result: any = coiToProvenance(baseRecord);
    expect(result.entity[0].what.display).toBe('Drug A');
  });

  it('should include conflict level in entity extension', () => {
    const result: any = coiToProvenance(baseRecord);
    const conflictLevelExt = result.entity[0].extension.find(
      (e: any) => e.url === 'http://opengrade.org/fhir/StructureDefinition/coi-conflict-level',
    );
    expect(conflictLevelExt).toBeDefined();
    expect(conflictLevelExt.valueCode).toBe('LOW');
  });

  it('should include excludeFromVoting in entity extension', () => {
    const result: any = coiToProvenance(baseRecord);
    const excludeExt = result.entity[0].extension.find(
      (e: any) => e.url === 'http://opengrade.org/fhir/StructureDefinition/coi-excluded-from-voting',
    );
    expect(excludeExt).toBeDefined();
    expect(excludeExt.valueBoolean).toBe(false);
  });

  it('should set excludeFromVoting to true when conflict excludes from voting', () => {
    const record = {
      ...baseRecord,
      interventionConflicts: [{ ...baseConflict, excludeFromVoting: true }],
    };
    const result: any = coiToProvenance(record);
    const excludeExt = result.entity[0].extension.find(
      (e: any) => e.url === 'http://opengrade.org/fhir/StructureDefinition/coi-excluded-from-voting',
    );
    expect(excludeExt.valueBoolean).toBe(true);
  });

  it('should map multiple intervention conflicts to multiple entity entries', () => {
    const record = {
      ...baseRecord,
      interventionConflicts: [
        baseConflict,
        { ...baseConflict, id: 'conflict-2', interventionLabel: 'Drug B', conflictLevel: 'HIGH' as const },
      ],
    };
    const result: any = coiToProvenance(record);
    expect(result.entity).toHaveLength(2);
    expect(result.entity[1].what.display).toBe('Drug B');
  });

  it('should produce empty entity array when interventionConflicts is absent', () => {
    const record = { ...baseRecord, interventionConflicts: undefined };
    const result: any = coiToProvenance(record);
    expect(result.entity).toEqual([]);
  });

  it('should produce empty entity array when interventionConflicts is empty', () => {
    const record = { ...baseRecord, interventionConflicts: [] };
    const result: any = coiToProvenance(record);
    expect(result.entity).toEqual([]);
  });

  // ── extension (public summary) ────────────────────────────────────────────

  it('should include public summary in top-level extension', () => {
    const result: any = coiToProvenance(baseRecord);
    const summaryExt = result.extension.find(
      (e: any) => e.url === 'http://opengrade.org/fhir/StructureDefinition/coi-public-summary',
    );
    expect(summaryExt).toBeDefined();
    expect(summaryExt.valueString).toBe('No significant conflicts of interest.');
  });

  it('should use empty string when publicSummary is null', () => {
    const record = { ...baseRecord, publicSummary: null };
    const result: any = coiToProvenance(record);
    const summaryExt = result.extension.find(
      (e: any) => e.url === 'http://opengrade.org/fhir/StructureDefinition/coi-public-summary',
    );
    expect(summaryExt.valueString).toBe('');
  });
});
