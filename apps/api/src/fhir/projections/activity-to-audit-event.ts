/**
 * Maps internal actionType values to FHIR AuditEvent action codes.
 *
 * @see https://hl7.org/fhir/R5/valueset-audit-event-action.html
 */
const actionMap: Record<string, string> = {
  CREATE: 'C',
  UPDATE: 'U',
  DELETE: 'D',
  READ: 'R',
  PUBLISH: 'E',
  IMPORT: 'E',
};

/**
 * Projects an internal ActivityLogEntry to a FHIR R5 AuditEvent resource.
 *
 * Provides an audit trail in a standards-compliant format.
 *
 * @see https://hl7.org/fhir/R5/auditevent.html
 */
export function activityToAuditEvent(entry: any): object {
  return {
    resourceType: 'AuditEvent',
    id: entry.id,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/AuditEvent'],
      lastUpdated: entry.timestamp?.toISOString(),
    },
    type: {
      system: 'http://dicom.nema.org/resources/ontology/DCM',
      code: '110100',
      display: 'Application Activity',
    },
    subtype: [{ display: entry.actionType }],
    action: actionMap[entry.actionType] ?? 'E',
    recorded: entry.timestamp?.toISOString(),
    outcome: '0',
    agent: [
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
              code: 'AUT',
            },
          ],
        },
        who: {
          reference: `Practitioner/${entry.userId}`,
          display: entry.user?.displayName ?? entry.user?.name ?? entry.userId,
        },
        requestor: true,
      },
    ],
    source: {
      observer: { display: 'OpenGRADE API' },
    },
    entity: entry.entityId
      ? [
          {
            what: { reference: `${entry.entityType ?? 'Resource'}/${entry.entityId}` },
            type: { display: entry.entityType ?? 'unknown' },
            detail: entry.changeDetails
              ? [{ type: 'changeDetails', valueString: JSON.stringify(entry.changeDetails) }]
              : [],
          },
        ]
      : [],
  };
}
