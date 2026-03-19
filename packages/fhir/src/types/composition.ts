/**
 * FHIR R5 Composition Resource
 *
 * A set of healthcare-related information that is assembled together into a single logical
 * package that provides a single coherent statement of meaning, establishes its own context
 * and that has clinical attestation with regard to who is making the statement.
 *
 * Used in OpenGRADE to represent Guidelines.
 *
 * @see https://hl7.org/fhir/R5/composition.html
 */

import type {
  FhirDomainResource,
  FhirIdentifier,
  FhirCodeableConcept,
  FhirReference,
  FhirNarrative,
  FhirPeriod,
  FhirBackboneElement,
  FhirExtension,
  FhirDateTime,
  FhirCode,
} from './base';

// ─── Composition.attester ─────────────────────────────────────────────────────

/** A participant who has attested to the accuracy of the composition */
export interface FhirCompositionAttester extends FhirBackboneElement {
  /** personal | professional | legal | official */
  mode: FhirCodeableConcept;
  time?: FhirDateTime;
  party?: FhirReference;
}

// ─── Composition.event ───────────────────────────────────────────────────────

/** The clinical service(s) being documented */
export interface FhirCompositionEvent extends FhirBackboneElement {
  period?: FhirPeriod;
  detail?: FhirReference[];
}

// ─── Composition.section ─────────────────────────────────────────────────────

/** A section within a Composition */
export interface FhirCompositionSection extends FhirBackboneElement {
  /** Label for section (e.g. for ToC) */
  title?: string;
  /** Classification of section (recommended) */
  code?: FhirCodeableConcept;
  /** Who and/or what authored the section */
  author?: FhirReference[];
  /** Who/what the section is about, when it is not about the subject of composition */
  focus?: FhirReference;
  /** Text summary of the section, for human interpretation */
  text?: FhirNarrative;
  /** Why the section is empty */
  emptyReason?: FhirCodeableConcept;
  /** A reference to data that supports this section */
  entry?: FhirReference[];
  /** working | snapshot | changes */
  orderedBy?: FhirCodeableConcept;
  /** Nested Section */
  section?: FhirCompositionSection[];
}

// ─── Composition ─────────────────────────────────────────────────────────────

/**
 * A composition is a set of healthcare-related information assembled into a document.
 * Maps to OpenGRADE Guideline.
 */
export interface FhirComposition extends FhirDomainResource {
  resourceType: 'Composition';

  /** Canonical identifier for this Composition, represented as a URI */
  url?: string;
  /** Version-independent identifier for the Composition */
  identifier?: FhirIdentifier[];
  /** preliminary | final | amended | entered-in-error | deprecated */
  status: 'preliminary' | 'final' | 'amended' | 'entered-in-error' | 'deprecated';
  /** Kind of composition (LOINC if possible) */
  type: FhirCodeableConcept;
  /** Categorization of Composition */
  category?: FhirCodeableConcept[];
  /** Who and/or what the composition is about */
  subject?: FhirReference[];
  /** Context of the Composition */
  encounter?: FhirReference;
  /** Composition editing time */
  date: FhirDateTime;
  /** The context that the content is intended to support */
  useContext?: Array<{
    code: { system?: string; code?: FhirCode };
    valueCodeableConcept?: FhirCodeableConcept;
  }>;
  /** Who and/or what authored the composition */
  author: FhirReference[];
  /** Name used to represent this composition */
  name?: string;
  /** Human Readable name/title */
  title: string;
  /** For any additional notes */
  note?: Array<{ text: string }>;
  /** Attests to accuracy of composition */
  attester?: FhirCompositionAttester[];
  /** Organization which maintains the composition */
  custodian?: FhirReference;
  /** Relationships to other compositions/documents */
  relatesTo?: Array<{
    type: FhirCode;
    resourceReference?: FhirReference;
  }>;
  /** The clinical service(s) being documented */
  event?: FhirCompositionEvent[];
  /** Composition is broken into sections */
  section?: FhirCompositionSection[];
  /** Additional extensions */
  extension?: FhirExtension[];
}
