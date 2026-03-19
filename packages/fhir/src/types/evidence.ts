/**
 * FHIR R5 Evidence and EvidenceVariable Resources
 *
 * Evidence is the central element of the EBM (Evidence Based Medicine) resources,
 * representing the combination of population, exposure/intervention, and outcome
 * (PICO framework) together with statistics.
 *
 * Used in OpenGRADE to represent PICOs and their associated Outcomes.
 *
 * @see https://hl7.org/fhir/R5/evidence.html
 * @see https://hl7.org/fhir/R5/evidencevariable.html
 */

import type {
  FhirDomainResource,
  FhirIdentifier,
  FhirCodeableConcept,
  FhirReference,
  FhirRelatedArtifact,
  FhirExtension,
  FhirContactDetail,
  FhirMarkdown,
  FhirAnnotation,
  FhirQuantity,
  FhirRange,
  FhirDateTime,
  FhirBackboneElement,
} from './base';

// ─── Evidence.statistic sub-types ────────────────────────────────────────────

/** An estimate of the sample size used in a statistic */
export interface FhirEvidenceStatisticSampleSize extends FhirBackboneElement {
  description?: FhirMarkdown;
  note?: FhirAnnotation[];
  /** Number of contributing studies */
  numberOfStudies?: number;
  /** Cumulative number of participants */
  numberOfParticipants?: number;
  /** Number of participants with known results for measured variables */
  knownDataCount?: number;
}

/** The type of attribute estimate (e.g., confidence interval) */
export interface FhirEvidenceStatisticAttributeEstimate extends FhirBackboneElement {
  description?: FhirMarkdown;
  note?: FhirAnnotation[];
  /** The attribute estimate type */
  type?: FhirCodeableConcept;
  /** The singular quantity of the attribute estimate */
  quantity?: FhirQuantity;
  /** Use 95 for a 95% confidence interval */
  level?: number;
  /** Lower bound of confidence interval */
  range?: FhirRange;
  /** A nested attribute estimate */
  attributeEstimate?: FhirEvidenceStatisticAttributeEstimate[];
}

/** Characteristic of the statistic model */
export interface FhirEvidenceStatisticModelCharacteristic extends FhirBackboneElement {
  /** Model or characteristic */
  code: FhirCodeableConcept;
  /** Numerical value to complete model specification */
  value?: FhirQuantity;
  /** A variable adjusted for in the adjusted analysis */
  variable?: Array<{
    variableDefinition: FhirReference;
    handling?: 'continuous' | 'dichotomous' | 'ordinal' | 'polychotomous';
    valueCategory?: FhirCodeableConcept[];
    valueQuantity?: FhirQuantity[];
    valueRange?: FhirRange[];
  }>;
  /** An attribute of the statistic used as a model characteristic */
  attributeEstimate?: FhirEvidenceStatisticAttributeEstimate[];
}

/**
 * Values and parameters for a single statistic.
 */
export interface FhirEvidenceStatistic extends FhirBackboneElement {
  description?: FhirMarkdown;
  note?: FhirAnnotation[];
  /** Type of statistic (e.g. relative risk, mean difference) */
  statisticType?: FhirCodeableConcept;
  /** Associated category for categorical variable */
  category?: FhirCodeableConcept;
  /** Statistic value */
  quantity?: FhirQuantity;
  /** The number of events associated with the statistic */
  numberOfEvents?: number;
  /** The number of participants affected */
  numberAffected?: number;
  /** Number of samples in the statistic */
  sampleSize?: FhirEvidenceStatisticSampleSize;
  /** An attribute of the statistic */
  attributeEstimate?: FhirEvidenceStatisticAttributeEstimate[];
  /** A component of the method to generate the statistic */
  modelCharacteristic?: FhirEvidenceStatisticModelCharacteristic[];
}

// ─── Evidence.certainty ──────────────────────────────────────────────────────

/**
 * Certainty or quality of the evidence, including GRADE domains.
 */
export interface FhirEvidenceCertainty extends FhirBackboneElement {
  description?: FhirMarkdown;
  note?: FhirAnnotation[];
  /** Aspect of certainty being rated */
  type?: FhirCodeableConcept;
  /** Assessment or judgement of the aspect */
  rating?: FhirCodeableConcept;
  /** Individual or group responsible for the rating */
  rater?: string;
  /** A domain or subdomain of certainty */
  subcomponent?: FhirEvidenceCertainty[];
}

// ─── Evidence.variableDefinition ─────────────────────────────────────────────

/**
 * Evidence variable definition (population, exposure, outcome).
 */
export interface FhirEvidenceVariableDefinition extends FhirBackboneElement {
  description?: FhirMarkdown;
  note?: FhirAnnotation[];
  /** population | subpopulation | exposure | referenceExposure | measuredVariable | confounder */
  variableRole: FhirCodeableConcept;
  /** Definition of the actual variable related to the statistic(s) */
  observed?: FhirReference;
  /** Definition of the intended variable related to the Evidence */
  intended?: FhirReference;
  /** low | moderate | high | exact */
  directnessMatch?: FhirCodeableConcept;
}

// ─── Evidence ────────────────────────────────────────────────────────────────

/**
 * The Evidence resource represents the evidence relevant to clinical decision making.
 * Maps to OpenGRADE PICO (with Outcomes mapped to statistic[]).
 */
export interface FhirEvidence extends FhirDomainResource {
  resourceType: 'Evidence';

  /** Canonical identifier for this evidence */
  url?: string;
  /** Additional identifier for the evidence */
  identifier?: FhirIdentifier[];
  /** Business version of the evidence */
  version?: string;
  /** Name for this evidence (machine readable) */
  name?: string;
  /** Name for this evidence (human friendly) */
  title?: string;
  /** Title for a related citation */
  citeAsReference?: FhirReference;
  citeAsMarkdown?: FhirMarkdown;
  /** draft | active | retired | unknown */
  status: 'draft' | 'active' | 'retired' | 'unknown';
  /** For testing purposes, not real usage */
  experimental?: boolean;
  /** Date last changed */
  date?: FhirDateTime;
  /** When the evidence was approved by publisher */
  approvalDate?: string;
  /** When the evidence was last reviewed by the publisher */
  lastReviewDate?: string;
  /** Name of the publisher/steward */
  publisher?: string;
  /** Contact details for the publisher */
  contact?: FhirContactDetail[];
  /** Who authored the content */
  author?: FhirContactDetail[];
  /** Who edited the content */
  editor?: FhirContactDetail[];
  /** Who reviewed the content */
  reviewer?: FhirContactDetail[];
  /** Who endorsed the content */
  endorser?: FhirContactDetail[];
  /** Link or citation for the synthesis */
  relatedArtifact?: FhirRelatedArtifact[];
  /** Description of the particular summary */
  description?: FhirMarkdown;
  /** Declarative description of the Evidence */
  assertion?: FhirMarkdown;
  /** Footnotes and/or explanatory notes */
  note?: FhirAnnotation[];
  /** Evidence variable definitions (population, exposure, outcome) */
  variableDefinition: FhirEvidenceVariableDefinition[];
  /** The particular type of synthesis if this is a synthesis summary */
  synthesisType?: FhirCodeableConcept;
  /** The design of the study that produced this evidence */
  studyDesign?: FhirCodeableConcept[];
  /** Values and parameters for a single statistic */
  statistic?: FhirEvidenceStatistic[];
  /** Certainty or quality of the evidence */
  certainty?: FhirEvidenceCertainty[];
  /** Extensions for OpenGRADE-specific metadata */
  extension?: FhirExtension[];
}

// ─── EvidenceVariable ────────────────────────────────────────────────────────

/**
 * The EvidenceVariable resource describes an element that knowledge (Evidence) is about.
 * Supports the detailed description of populations, interventions, and outcomes.
 *
 * @see https://hl7.org/fhir/R5/evidencevariable.html
 */
export interface FhirEvidenceVariable extends FhirDomainResource {
  resourceType: 'EvidenceVariable';

  /** Canonical identifier for this evidence variable */
  url?: string;
  /** Additional identifier for the evidence variable */
  identifier?: FhirIdentifier[];
  /** Business version of the evidence variable */
  version?: string;
  /** Name for this evidence variable (machine readable) */
  name?: string;
  /** Name for this evidence variable (human friendly) */
  title?: string;
  /** Title for use in informal contexts */
  shortTitle?: string;
  /** draft | active | retired | unknown */
  status: 'draft' | 'active' | 'retired' | 'unknown';
  /** For testing purposes, not real usage */
  experimental?: boolean;
  /** Date last changed */
  date?: FhirDateTime;
  /** Name of the publisher/steward */
  publisher?: string;
  /** Contact details for the publisher */
  contact?: FhirContactDetail[];
  /** Natural language description of the evidence variable */
  description?: FhirMarkdown;
  /** Footnotes and/or explanatory notes */
  note?: FhirAnnotation[];
  /** The context that the content is intended to support */
  useContext?: Array<{
    code: { system?: string; code?: string };
    valueCodeableConcept?: FhirCodeableConcept;
  }>;
  /** dichotomous | continuous | descriptive */
  handling?: 'continuous' | 'dichotomous' | 'ordinal' | 'polychotomous';
  /** A defining factor of the EvidenceVariable */
  characteristic?: Array<{
    linkId?: string;
    description?: FhirMarkdown;
    note?: FhirAnnotation[];
    exclude?: boolean;
    definitionReference?: FhirReference;
    definitionCanonical?: string;
    definitionCodeableConcept?: FhirCodeableConcept;
    definitionExpression?: { language: string; expression: string };
    definitionId?: string;
    definitionByTypeAndValue?: {
      type: FhirCodeableConcept;
      method?: FhirCodeableConcept[];
      device?: FhirReference;
      valueCodeableConcept?: FhirCodeableConcept;
      valueBoolean?: boolean;
      valueQuantity?: FhirQuantity;
      valueRange?: FhirRange;
      valueId?: string;
    };
    definitionByCombination?: {
      code: 'all-of' | 'any-of' | 'at-least' | 'at-most' | 'statistical' | 'net-effect' | 'dataset';
      threshold?: number;
      characteristic?: unknown[];
    };
    timeFromEvent?: Array<{
      description?: FhirMarkdown;
      note?: FhirAnnotation[];
      eventCodeableConcept?: FhirCodeableConcept;
      eventReference?: FhirReference;
      eventDateTime?: FhirDateTime;
      eventId?: string;
      quantity?: FhirQuantity;
      range?: FhirRange;
    }>;
    instancesQuantity?: FhirQuantity;
    instancesRange?: FhirRange;
    durationQuantity?: FhirQuantity;
    durationRange?: FhirRange;
  }>;
  /** A grouping (or set of values) described along with other groupings to specify the intended definitional groupings of the Evidence variable */
  category?: Array<{
    name?: string;
    valueCodeableConcept?: FhirCodeableConcept;
    valueQuantity?: FhirQuantity;
    valueRange?: FhirRange;
  }>;
}
