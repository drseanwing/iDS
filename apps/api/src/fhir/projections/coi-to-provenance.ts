/**
 * Projects an internal CoiRecord to a FHIR R5 Provenance resource.
 *
 * Tracks conflicts of interest as provenance records linked to the guideline Composition.
 *
 * @see https://hl7.org/fhir/R5/provenance.html
 */
export function coiToProvenance(record: any): object {
  return {
    resourceType: 'Provenance',
    id: record.id,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Provenance'],
      lastUpdated: record.updatedAt?.toISOString(),
    },
    target: [{ reference: `Composition/${record.guidelineId}` }],
    recorded: record.updatedAt?.toISOString(),
    agent: [
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type',
              code: 'author',
            },
          ],
        },
        who: {
          reference: `Practitioner/${record.userId}`,
          display: record.user?.displayName ?? record.user?.name ?? record.userId,
        },
      },
    ],
    entity: (record.interventionConflicts ?? []).map((c: any) => ({
      role: 'source',
      what: { display: c.interventionLabel },
      extension: [
        {
          url: 'http://opengrade.org/fhir/StructureDefinition/coi-conflict-level',
          valueCode: c.conflictLevel ?? 'NONE',
        },
        {
          url: 'http://opengrade.org/fhir/StructureDefinition/coi-excluded-from-voting',
          valueBoolean: c.excludeFromVoting ?? false,
        },
      ],
    })),
    extension: [
      {
        url: 'http://opengrade.org/fhir/StructureDefinition/coi-public-summary',
        valueString: record.publicSummary ?? '',
      },
    ],
  };
}
