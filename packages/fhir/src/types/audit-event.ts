/**
 * FHIR R5 AuditEvent Resource
 *
 * A record of an event relevant to purposes of security, privacy, or operations
 * that occurred or was attempted. Used to record authentication events,
 * document access, data modifications, and other activities.
 *
 * Used in OpenGRADE to represent the activity log for guideline and
 * recommendation lifecycle events.
 *
 * @see https://hl7.org/fhir/R5/auditevent.html
 */

import type {
  FhirDomainResource,
  FhirCodeableConcept,
  FhirReference,
  FhirExtension,
  FhirInstant,
  FhirUri,
  FhirBackboneElement,
} from './base';

// ─── AuditEvent.outcome ───────────────────────────────────────────────────────

/**
 * Indicates whether the event succeeded or failed.
 */
export interface FhirAuditEventOutcome extends FhirBackboneElement {
  /** Whether the event succeeded or failed */
  code: {
    system?: FhirUri;
    code?: string;
    display?: string;
  };
  /** Additional details about the error */
  detail?: FhirCodeableConcept[];
}

// ─── AuditEvent.agent ────────────────────────────────────────────────────────

/**
 * Participating agent in an audit event.
 */
export interface FhirAuditEventAgent extends FhirBackboneElement {
  /** How agent participated */
  type?: FhirCodeableConcept;
  /** Agent role in the event */
  role?: FhirCodeableConcept[];
  /** Identifier of who */
  who: FhirReference;
  /** Whether user is initiator */
  requestor: boolean;
  /** Where */
  location?: FhirReference;
  /** Policy that authorized event */
  policy?: FhirUri[];
  /** This agent network location for the activity */
  networkReference?: FhirReference;
  networkUri?: FhirUri;
  networkString?: string;
  /** Allowable authorization for this agent */
  authorization?: FhirCodeableConcept[];
}

// ─── AuditEvent.source ───────────────────────────────────────────────────────

/**
 * The actor that is reporting the event.
 */
export interface FhirAuditEventSource extends FhirBackboneElement {
  /** Logical source location within the enterprise */
  site?: FhirReference;
  /** The identity of source detecting the event */
  observer: FhirReference;
  /** The type of source where event originated */
  type?: FhirCodeableConcept[];
}

// ─── AuditEvent.entity ───────────────────────────────────────────────────────

/**
 * Data or objects used in the audit event.
 */
export interface FhirAuditEventEntity extends FhirBackboneElement {
  /** Specific instance of resource */
  what?: FhirReference;
  /** The role that the entity played in the event */
  role?: FhirCodeableConcept;
  /** Security labels on the entity */
  securityLabel?: FhirCodeableConcept[];
  /** Query parameters */
  query?: string;
  /** Additional information supplied about the entity */
  detail?: Array<{
    type: FhirCodeableConcept;
    valueQuantity?: { value?: number; unit?: string };
    valueCodeableConcept?: FhirCodeableConcept;
    valueString?: string;
    valueBoolean?: boolean;
    valueInteger?: number;
    valueRange?: unknown;
    valueRatio?: unknown;
    valueHumanName?: unknown;
    valueDateTime?: FhirInstant;
    valuePeriod?: unknown;
    valueBase64Binary?: string;
  }>;
  /** Entity is attributed to this agent */
  agent?: FhirAuditEventAgent[];
}

// ─── AuditEvent ──────────────────────────────────────────────────────────────

/**
 * A record of an event relevant to purposes of security, privacy, or operations.
 * Maps to OpenGRADE activity log entries for tracking guideline lifecycle events.
 */
export interface FhirAuditEvent extends FhirDomainResource {
  resourceType: 'AuditEvent';

  /**
   * Type/identifier of event.
   * For OpenGRADE: guideline-create, guideline-publish, recommendation-update, etc.
   */
  category?: FhirCodeableConcept[];
  /** Specific type of event */
  code: FhirCodeableConcept;
  /** Type of action performed during the event */
  action?: 'C' | 'R' | 'U' | 'D' | 'E';
  /** When the activity occurred */
  severity?: 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'informational' | 'debug';
  /** When the event occurred */
  occurredPeriod?: { start?: FhirInstant; end?: FhirInstant };
  occurredDateTime?: FhirInstant;
  /** When was resource last changed */
  recorded: FhirInstant;
  /** Whether the event succeeded or failed */
  outcome?: FhirAuditEventOutcome;
  /** Authorization related to the event */
  authorization?: FhirCodeableConcept[];
  /** Encounter within which this event occurred or which the event is tightly associated */
  encounter?: FhirReference;
  /** Actor involved in the event */
  agent: FhirAuditEventAgent[];
  /** Audit Event Reporter */
  source: FhirAuditEventSource;
  /** Data or objects used */
  entity?: FhirAuditEventEntity[];
  /** Extensions for OpenGRADE-specific metadata */
  extension?: FhirExtension[];
}
