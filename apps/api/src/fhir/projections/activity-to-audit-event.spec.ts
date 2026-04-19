import { activityToAuditEvent } from './activity-to-audit-event';

describe('activityToAuditEvent', () => {
  // ── Fixtures ─────────────────────────────────────────────────────────────

  const baseEntry = {
    id: 'log-entry-uuid-1234-5678-abcd-ef1234567890',
    guidelineId: 'guideline-uuid-1234-5678-abcd-ef1234567890',
    userId: 'user-uuid-1234-5678-abcd-ef1234567890',
    timestamp: new Date('2024-04-01T09:30:00.000Z'),
    actionType: 'CREATE',
    entityType: 'Recommendation',
    entityId: 'entity-uuid-1234-5678-abcd-ef1234567890',
    entityTitle: 'Use aspirin for secondary prevention',
    changeDetails: { field: 'strength', from: null, to: 'STRONG_FOR' },
    comment: null,
    isFlagged: false,
    user: { id: 'user-uuid-1234-5678-abcd-ef1234567890', displayName: 'Dr. John Doe', email: 'john@example.com' },
  };

  // ── resourceType ─────────────────────────────────────────────────────────

  it('should produce resourceType AuditEvent', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.resourceType).toBe('AuditEvent');
  });

  it('should carry the ActivityLogEntry id', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.id).toBe(baseEntry.id);
  });

  // ── meta ─────────────────────────────────────────────────────────────────

  it('should include the AuditEvent profile URL', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.meta.profile).toContain(
      'http://hl7.org/fhir/StructureDefinition/AuditEvent',
    );
  });

  it('should set lastUpdated from timestamp', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.meta.lastUpdated).toBe('2024-04-01T09:30:00.000Z');
  });

  // ── type coding ──────────────────────────────────────────────────────────

  it('should set type to DICOM Application Activity code', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.type.system).toBe('http://dicom.nema.org/resources/ontology/DCM');
    expect(result.type.code).toBe('110100');
    expect(result.type.display).toBe('Application Activity');
  });

  // ── subtype ───────────────────────────────────────────────────────────────

  it('should set subtype display to actionType', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.subtype[0].display).toBe('CREATE');
  });

  // ── action mapping ───────────────────────────────────────────────────────

  it('should map CREATE actionType to action code C', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.action).toBe('C');
  });

  it('should map UPDATE actionType to action code U', () => {
    const result: any = activityToAuditEvent({ ...baseEntry, actionType: 'UPDATE' });
    expect(result.action).toBe('U');
  });

  it('should map DELETE actionType to action code D', () => {
    const result: any = activityToAuditEvent({ ...baseEntry, actionType: 'DELETE' });
    expect(result.action).toBe('D');
  });

  it('should map READ actionType to action code R', () => {
    const result: any = activityToAuditEvent({ ...baseEntry, actionType: 'READ' });
    expect(result.action).toBe('R');
  });

  it('should map PUBLISH actionType to action code E', () => {
    const result: any = activityToAuditEvent({ ...baseEntry, actionType: 'PUBLISH' });
    expect(result.action).toBe('E');
  });

  it('should map IMPORT actionType to action code E', () => {
    const result: any = activityToAuditEvent({ ...baseEntry, actionType: 'IMPORT' });
    expect(result.action).toBe('E');
  });

  it('should default unknown actionType to action code E', () => {
    const result: any = activityToAuditEvent({ ...baseEntry, actionType: 'EXPORT' });
    expect(result.action).toBe('E');
  });

  // ── recorded ─────────────────────────────────────────────────────────────

  it('should set recorded from timestamp ISO string', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.recorded).toBe('2024-04-01T09:30:00.000Z');
  });

  // ── outcome ───────────────────────────────────────────────────────────────

  it('should set outcome to 0 (success)', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.outcome).toBe('0');
  });

  // ── agent ────────────────────────────────────────────────────────────────

  it('should include exactly one agent', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.agent).toHaveLength(1);
  });

  it('should set agent.who.reference to Practitioner/userId', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.agent[0].who.reference).toBe(`Practitioner/${baseEntry.userId}`);
  });

  it('should set agent.who.display from user.displayName', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.agent[0].who.display).toBe('Dr. John Doe');
  });

  it('should fall back agent.who.display to userId when user is absent', () => {
    const entry = { ...baseEntry, user: undefined };
    const result: any = activityToAuditEvent(entry);
    expect(result.agent[0].who.display).toBe(baseEntry.userId);
  });

  it('should set agent.requestor to true', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.agent[0].requestor).toBe(true);
  });

  it('should set agent type coding to AUT', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.agent[0].type.coding[0].code).toBe('AUT');
    expect(result.agent[0].type.coding[0].system).toBe(
      'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
    );
  });

  // ── source ────────────────────────────────────────────────────────────────

  it('should set source observer display to OpenGRADE API', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.source.observer.display).toBe('OpenGRADE API');
  });

  // ── entity ────────────────────────────────────────────────────────────────

  it('should include entity array with one entry when entityId is set', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.entity).toHaveLength(1);
  });

  it('should set entity.what.reference from entityType and entityId', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.entity[0].what.reference).toBe(
      `${baseEntry.entityType}/${baseEntry.entityId}`,
    );
  });

  it('should set entity type display from entityType', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.entity[0].type.display).toBe('Recommendation');
  });

  it('should include changeDetails in entity detail when present', () => {
    const result: any = activityToAuditEvent(baseEntry);
    expect(result.entity[0].detail).toHaveLength(1);
    expect(result.entity[0].detail[0].type).toBe('changeDetails');
    expect(result.entity[0].detail[0].valueString).toBe(
      JSON.stringify(baseEntry.changeDetails),
    );
  });

  it('should produce empty detail array when changeDetails is null', () => {
    const entry = { ...baseEntry, changeDetails: null };
    const result: any = activityToAuditEvent(entry);
    expect(result.entity[0].detail).toEqual([]);
  });

  it('should produce empty entity array when entityId is not set', () => {
    const entry = { ...baseEntry, entityId: null as any };
    const result: any = activityToAuditEvent(entry);
    expect(result.entity).toEqual([]);
  });

  it('should use Resource as default entityType when entityType is null', () => {
    const entry = { ...baseEntry, entityType: null as any };
    const result: any = activityToAuditEvent(entry);
    expect(result.entity[0].what.reference).toBe(
      `Resource/${baseEntry.entityId}`,
    );
    expect(result.entity[0].type.display).toBe('unknown');
  });
});
