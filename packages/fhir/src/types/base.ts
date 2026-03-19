/**
 * FHIR R5 Base Types
 *
 * Core primitive and complex types used across all FHIR R5 resources.
 * @see https://hl7.org/fhir/R5/datatypes.html
 */

// ─── Primitive wrappers ───────────────────────────────────────────────────────

/** FHIR instant (ISO 8601 with timezone) */
export type FhirInstant = string;

/** FHIR dateTime (ISO 8601, may be partial) */
export type FhirDateTime = string;

/** FHIR date (YYYY, YYYY-MM, or YYYY-MM-DD) */
export type FhirDate = string;

/** FHIR uri */
export type FhirUri = string;

/** FHIR url */
export type FhirUrl = string;

/** FHIR canonical (url with optional version) */
export type FhirCanonical = string;

/** FHIR code (string from a value set) */
export type FhirCode = string;

/** FHIR markdown */
export type FhirMarkdown = string;

/** FHIR id (regex: [A-Za-z0-9\-\.]{1,64}) */
export type FhirId = string;

// ─── Extension ───────────────────────────────────────────────────────────────

/**
 * FHIR Extension
 * @see https://hl7.org/fhir/R5/extensibility.html
 */
export interface FhirExtension {
  /** Identifies the meaning of the extension */
  url: FhirUri;
  /** Value of extension (one of many possible value[x] types) */
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueDecimal?: number;
  valueCode?: FhirCode;
  valueUri?: FhirUri;
  valueDateTime?: FhirDateTime;
  valueDate?: FhirDate;
  valueQuantity?: FhirQuantity;
  valueCodeableConcept?: FhirCodeableConcept;
  valueCoding?: FhirCoding;
  valueReference?: FhirReference;
  valuePeriod?: FhirPeriod;
  valueRange?: FhirRange;
  valueAnnotation?: FhirAnnotation;
  /** Nested extensions */
  extension?: FhirExtension[];
}

// ─── Coding & CodeableConcept ─────────────────────────────────────────────────

/**
 * A reference to a code defined by a terminology system.
 * @see https://hl7.org/fhir/R5/datatypes.html#Coding
 */
export interface FhirCoding {
  /** Identity of the terminology system */
  system?: FhirUri;
  /** Version of the system (if relevant) */
  version?: string;
  /** Symbol in syntax defined by the system */
  code?: FhirCode;
  /** Representation defined by the system */
  display?: string;
  /** If this coding was chosen directly by the user */
  userSelected?: boolean;
}

/**
 * Concept - reference to a terminology or just text.
 * @see https://hl7.org/fhir/R5/datatypes.html#CodeableConcept
 */
export interface FhirCodeableConcept {
  /** Code defined by a terminology system */
  coding?: FhirCoding[];
  /** Plain text representation */
  text?: string;
}

// ─── Quantity & Range ─────────────────────────────────────────────────────────

/**
 * A measured amount (or an amount that can potentially be measured).
 * @see https://hl7.org/fhir/R5/datatypes.html#Quantity
 */
export interface FhirQuantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>' | 'ad';
  unit?: string;
  system?: FhirUri;
  code?: FhirCode;
}

/**
 * A set of ordered quantities defined by a low and high limit.
 * @see https://hl7.org/fhir/R5/datatypes.html#Range
 */
export interface FhirRange {
  low?: FhirQuantity;
  high?: FhirQuantity;
}

// ─── Identifier ───────────────────────────────────────────────────────────────

/**
 * An identifier intended for computation.
 * @see https://hl7.org/fhir/R5/datatypes.html#Identifier
 */
export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FhirCodeableConcept;
  /** The namespace for the identifier value */
  system?: FhirUri;
  value?: string;
  period?: FhirPeriod;
  assigner?: FhirReference;
}

// ─── Reference ───────────────────────────────────────────────────────────────

/**
 * A reference from one resource to another.
 * @see https://hl7.org/fhir/R5/references.html
 */
export interface FhirReference<T extends string = string> {
  /** Literal reference, relative, internal or absolute URL */
  reference?: string;
  /** Type the reference refers to (e.g. "Patient") */
  type?: T;
  identifier?: FhirIdentifier;
  display?: string;
}

// ─── Period ──────────────────────────────────────────────────────────────────

/**
 * Time range defined by start and end date/time.
 * @see https://hl7.org/fhir/R5/datatypes.html#Period
 */
export interface FhirPeriod {
  start?: FhirDateTime;
  end?: FhirDateTime;
}

// ─── Narrative ───────────────────────────────────────────────────────────────

/**
 * A human-readable summary of the resource.
 * @see https://hl7.org/fhir/R5/narrative.html
 */
export interface FhirNarrative {
  /** generated | extensions | additional | empty */
  status: 'generated' | 'extensions' | 'additional' | 'empty';
  /** XHTML content (must be valid XHTML) */
  div: string;
}

// ─── Annotation ──────────────────────────────────────────────────────────────

/**
 * A text note with attribution.
 * @see https://hl7.org/fhir/R5/datatypes.html#Annotation
 */
export interface FhirAnnotation {
  authorReference?: FhirReference;
  authorString?: string;
  time?: FhirDateTime;
  text: FhirMarkdown;
}

// ─── Meta ────────────────────────────────────────────────────────────────────

/**
 * Metadata about a resource.
 * @see https://hl7.org/fhir/R5/resource.html#Meta
 */
export interface FhirMeta {
  /** Version specific identifier */
  versionId?: FhirId;
  /** When the resource version last changed */
  lastUpdated?: FhirInstant;
  /** Identifies where the resource comes from */
  source?: FhirUri;
  /** Profiles this resource claims to conform to */
  profile?: FhirCanonical[];
  /** Security labels applied to this resource */
  security?: FhirCoding[];
  /** Tags applied to this resource */
  tag?: FhirCoding[];
}

// ─── ContactPoint ─────────────────────────────────────────────────────────────

/**
 * Details for all kinds of technology-mediated contact points.
 * @see https://hl7.org/fhir/R5/datatypes.html#ContactPoint
 */
export interface FhirContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: FhirPeriod;
}

// ─── Address ─────────────────────────────────────────────────────────────────

/**
 * An address expressed using postal conventions.
 * @see https://hl7.org/fhir/R5/datatypes.html#Address
 */
export interface FhirAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FhirPeriod;
}

// ─── HumanName ───────────────────────────────────────────────────────────────

/**
 * A human's name with the ability to identify parts and usage.
 * @see https://hl7.org/fhir/R5/datatypes.html#HumanName
 */
export interface FhirHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FhirPeriod;
}

// ─── BackboneElement ─────────────────────────────────────────────────────────

/**
 * Base for elements defined inside a resource.
 * @see https://hl7.org/fhir/R5/backboneelement.html
 */
export interface FhirBackboneElement {
  id?: string;
  extension?: FhirExtension[];
  modifierExtension?: FhirExtension[];
}

// ─── Resource & DomainResource ───────────────────────────────────────────────

/**
 * Base definition for all FHIR resources.
 * @see https://hl7.org/fhir/R5/resource.html
 */
export interface FhirResource {
  /** Discriminator for the resource type */
  resourceType: string;
  /** Logical id of this artifact */
  id?: FhirId;
  /** Metadata about the resource */
  meta?: FhirMeta;
  /** A set of rules under which this content was created */
  implicitRules?: FhirUri;
  /** Language of the resource content */
  language?: FhirCode;
}

/**
 * A resource that includes narrative, extensions, and contained resources.
 * @see https://hl7.org/fhir/R5/domainresource.html
 */
export interface FhirDomainResource extends FhirResource {
  /** Text summary of the resource, for human interpretation */
  text?: FhirNarrative;
  /** Contained, inline Resources */
  contained?: FhirResource[];
  /** Additional content defined by implementations */
  extension?: FhirExtension[];
  /** Extensions that cannot be ignored */
  modifierExtension?: FhirExtension[];
}

// ─── RelatedArtifact ─────────────────────────────────────────────────────────

/**
 * Related artifacts such as additional documentation, justification, or bibliographic references.
 * @see https://hl7.org/fhir/R5/metadatatypes.html#RelatedArtifact
 */
export interface FhirRelatedArtifact {
  type:
    | 'documentation'
    | 'justification'
    | 'citation'
    | 'predecessor'
    | 'successor'
    | 'derived-from'
    | 'depends-on'
    | 'composed-of'
    | 'part-of'
    | 'amends'
    | 'amended-with'
    | 'appends'
    | 'appended-with'
    | 'cites'
    | 'cited-by'
    | 'comments-on'
    | 'comment-in'
    | 'contains'
    | 'contained-in'
    | 'corrects'
    | 'correction-in'
    | 'replaces'
    | 'replaced-with'
    | 'retracts'
    | 'retracted-by'
    | 'signs'
    | 'similar-to'
    | 'supports'
    | 'supported-with'
    | 'transforms'
    | 'transformed-into'
    | 'transformed-with'
    | 'documents'
    | 'specification-of'
    | 'created-with'
    | 'cite-as';
  classifier?: FhirCodeableConcept[];
  label?: string;
  display?: string;
  citation?: FhirMarkdown;
  document?: FhirAttachment;
  resource?: FhirCanonical;
  resourceReference?: FhirReference;
  publicationStatus?: FhirCode;
  publicationDate?: FhirDate;
}

// ─── Attachment ──────────────────────────────────────────────────────────────

/**
 * Content in a format defined elsewhere.
 * @see https://hl7.org/fhir/R5/datatypes.html#Attachment
 */
export interface FhirAttachment {
  contentType?: FhirCode;
  language?: FhirCode;
  data?: string;
  url?: FhirUrl;
  size?: number;
  hash?: string;
  title?: string;
  creation?: FhirDateTime;
  height?: number;
  width?: number;
  frames?: number;
  duration?: number;
  pages?: number;
}

// ─── UsageContext ─────────────────────────────────────────────────────────────

/**
 * Describes the context of use for a conformance or knowledge resource.
 * @see https://hl7.org/fhir/R5/metadatatypes.html#UsageContext
 */
export interface FhirUsageContext {
  code: FhirCoding;
  valueCodeableConcept?: FhirCodeableConcept;
  valueQuantity?: FhirQuantity;
  valueRange?: FhirRange;
  valueReference?: FhirReference;
}

// ─── ContactDetail ────────────────────────────────────────────────────────────

/**
 * Contact information for a person or organization.
 * @see https://hl7.org/fhir/R5/metadatatypes.html#ContactDetail
 */
export interface FhirContactDetail {
  name?: string;
  telecom?: FhirContactPoint[];
}
