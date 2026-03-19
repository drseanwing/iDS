/**
 * FHIR R5 ArtifactAssessment Resource
 *
 * This resource allows for the assessment of a knowledge artifact (e.g., Evidence,
 * PlanDefinition, Questionnaire) and is used to represent comments, ratings, and
 * classifications of any knowledge artifact, including certainty of evidence ratings
 * and Evidence-to-Decision (EtD) frameworks.
 *
 * Used in OpenGRADE to represent GRADE certainty assessments and EtD frameworks.
 *
 * @see https://hl7.org/fhir/R5/artifactassessment.html
 */

import type {
  FhirDomainResource,
  FhirIdentifier,
  FhirCodeableConcept,
  FhirReference,
  FhirExtension,
  FhirMarkdown,
  FhirDateTime,
  FhirBackboneElement,
  FhirAttachment,
  FhirUri,
  FhirCanonical,
  FhirDate,
} from './base';

// ─── ArtifactAssessment.content ──────────────────────────────────────────────

/**
 * A component of the content of the artifact assessment.
 */
export interface FhirArtifactAssessmentContent extends FhirBackboneElement {
  /**
   * Type of the content element:
   * comment | classifier | rating | container | response | change-request
   */
  informationType?:
    | 'comment'
    | 'classifier'
    | 'rating'
    | 'container'
    | 'response'
    | 'change-request';
  /** Brief summary of the content */
  summary?: FhirMarkdown;
  /** What type of content */
  type?: FhirCodeableConcept;
  /** Rating, classifier, or assessment */
  classifier?: FhirCodeableConcept[];
  /** Quantitative rating */
  quantity?: {
    value?: number;
    unit?: string;
    system?: FhirUri;
    code?: string;
  };
  /** Who authored the content */
  author?: FhirReference;
  /** Acceptable to publicly share the content */
  path?: FhirUri[];
  /** Acceptable to publicly share the content */
  relatedArtifact?: Array<{
    type: string;
    display?: string;
    citation?: FhirMarkdown;
    document?: FhirAttachment;
    resource?: FhirCanonical;
    resourceReference?: FhirReference;
  }>;
  /** Acceptable to publicly share the resource content */
  freeToShare?: boolean;
  /** Contained content */
  component?: FhirArtifactAssessmentContent[];
}

// ─── ArtifactAssessment ───────────────────────────────────────────────────────

/**
 * An assessment of an artifact, including certainty of evidence and EtD frameworks.
 * Maps to OpenGRADE GRADE assessments and Evidence-to-Decision (EtD) tables.
 */
export interface FhirArtifactAssessment extends FhirDomainResource {
  resourceType: 'ArtifactAssessment';

  /** Additional identifier for the artifact assessment */
  identifier?: FhirIdentifier[];
  /** A short title representing the assessment for display and documentation purposes */
  title?: string;
  /** How to cite the comment or rating */
  citeAsReference?: FhirReference;
  citeAsMarkdown?: FhirMarkdown;
  /** Date last changed */
  date?: FhirDateTime;
  /** Use and/or publishing restrictions */
  copyright?: FhirMarkdown;
  /** When the artifact assessment was approved by publisher */
  approvalDate?: FhirDate;
  /** When the artifact assessment was last reviewed by the publisher */
  lastReviewDate?: FhirDate;
  /**
   * The artifact that is being assessed.
   * References the Evidence, PlanDefinition, Citation, or other resource.
   */
  artifactReference?: FhirReference;
  artifactCanonical?: FhirCanonical;
  artifactUri?: FhirUri;
  /**
   * A component comment, classifier, or rating of the artifact.
   * For GRADE: contains certainty domains (riskOfBias, inconsistency, etc.)
   * For EtD: contains framework sections (desirable effects, undesirable effects, etc.)
   */
  content?: FhirArtifactAssessmentContent[];
  /**
   * Indicates the workflow status of the comment or change request.
   * submitted | triaged | waiting-for-input | resolved-no-change | resolved-change-required
   * | deferred | duplicate | applied | published | entered-in-error
   */
  workflowStatus?:
    | 'submitted'
    | 'triaged'
    | 'waiting-for-input'
    | 'resolved-no-change'
    | 'resolved-change-required'
    | 'deferred'
    | 'duplicate'
    | 'applied'
    | 'published'
    | 'entered-in-error';
  /**
   * Indicates the disposition of the responsible party to the comment or change request.
   * unresolved | not-persuasive | persuasive | persuasive-with-modification | not-persuasive-with-modification
   */
  disposition?:
    | 'unresolved'
    | 'not-persuasive'
    | 'persuasive'
    | 'persuasive-with-modification'
    | 'not-persuasive-with-modification';
  /** Extensions for OpenGRADE-specific metadata */
  extension?: FhirExtension[];
}
