/**
 * FHIR R5 PlanDefinition Resource
 *
 * This resource allows for the definition of various types of plans as a sharable,
 * consumable, and executable artifact. The resource is general enough to support
 * the description of a broad range of clinical and non-clinical artifacts such as
 * clinical decision support rules, order sets and protocols.
 *
 * Used in OpenGRADE to represent Recommendations.
 *
 * @see https://hl7.org/fhir/R5/plandefinition.html
 */

import type {
  FhirDomainResource,
  FhirIdentifier,
  FhirCodeableConcept,
  FhirReference,
  FhirRelatedArtifact,
  FhirExtension,
  FhirUsageContext,
  FhirContactDetail,
  FhirPeriod,
  FhirMarkdown,
  FhirCanonical,
  FhirDateTime,
  FhirCode,
  FhirBackboneElement,
} from './base';

// ─── PlanDefinition.action ───────────────────────────────────────────────────

/** Defines an expected trigger for a rule or protocol action */
export interface FhirPlanDefinitionActionCondition extends FhirBackboneElement {
  /** applicability | start | stop */
  kind: 'applicability' | 'start' | 'stop';
  expression?: {
    description?: string;
    name?: string;
    language: FhirCode;
    expression?: string;
    reference?: string;
  };
}

/** Relationship to another action */
export interface FhirPlanDefinitionActionRelatedAction extends FhirBackboneElement {
  /** What action is this related to */
  targetId: FhirCode;
  /** before-start | before | before-end | concurrent-with-start | concurrent | concurrent-with-end | after-start | after | after-end */
  relationship:
    | 'before-start'
    | 'before'
    | 'before-end'
    | 'concurrent-with-start'
    | 'concurrent'
    | 'concurrent-with-end'
    | 'after-start'
    | 'after'
    | 'after-end';
  offsetDuration?: { value?: number; unit?: string };
  offsetRange?: { low?: { value?: number }; high?: { value?: number } };
}

/** Dynamic value for an action */
export interface FhirPlanDefinitionActionDynamicValue extends FhirBackboneElement {
  /** The path to the element to be set dynamically */
  path?: string;
  expression?: {
    description?: string;
    language: FhirCode;
    expression?: string;
  };
}

/**
 * An action to be taken as part of the plan.
 */
export interface FhirPlanDefinitionAction extends FhirBackboneElement {
  /** Unique id for the action in the PlanDefinition */
  linkId?: string;
  /** User-visible prefix for the action */
  prefix?: string;
  /** User-visible title */
  title?: string;
  /** Brief description of the action */
  description?: FhirMarkdown;
  /** Static text equivalent of the action */
  textEquivalent?: FhirMarkdown;
  /** routine | urgent | asap | stat */
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  /** Code representing the meaning of the action */
  code?: FhirCodeableConcept;
  /** Why the action should be performed */
  reason?: FhirCodeableConcept[];
  /** Supporting documentation for the intended performer */
  documentation?: FhirRelatedArtifact[];
  /** What goals this action supports */
  goalId?: FhirCode[];
  /** Type of individual the action is focused on */
  subjectCodeableConcept?: FhirCodeableConcept;
  subjectReference?: FhirReference;
  subjectCanonical?: FhirCanonical;
  /** When the action should be triggered */
  trigger?: Array<{
    type: FhirCode;
    name?: string;
    timingDate?: string;
    timingDateTime?: FhirDateTime;
    timingTiming?: unknown;
  }>;
  /** Whether or not the action is applicable */
  condition?: FhirPlanDefinitionActionCondition[];
  /** Input data requirements */
  input?: Array<{
    title?: string;
    requirement?: unknown;
    relatedData?: FhirCode;
  }>;
  /** Output data definition */
  output?: Array<{
    title?: string;
    requirement?: unknown;
    relatedData?: string;
  }>;
  /** Relationship to another action */
  relatedAction?: FhirPlanDefinitionActionRelatedAction[];
  /** When the action should take place */
  timingAge?: unknown;
  timingDuration?: unknown;
  timingRange?: unknown;
  timingTiming?: unknown;
  /** Participant in the action */
  participant?: Array<{
    actorId?: string;
    type?: FhirCode;
    typeCanonical?: FhirCanonical;
    typeReference?: FhirReference;
    role?: FhirCodeableConcept;
    function?: FhirCodeableConcept;
  }>;
  /** create | update | remove | fire-event */
  type?: FhirCodeableConcept;
  /** visual-group | logical-group | sentence-group */
  groupingBehavior?: 'visual-group' | 'logical-group' | 'sentence-group';
  /** any | all | all-or-none | exactly-one | at-most-one | one-or-more */
  selectionBehavior?:
    | 'any'
    | 'all'
    | 'all-or-none'
    | 'exactly-one'
    | 'at-most-one'
    | 'one-or-more';
  /** must | could | must-unless-documented */
  requiredBehavior?: 'must' | 'could' | 'must-unless-documented';
  /** yes | no */
  precheckBehavior?: 'yes' | 'no';
  /** single | multiple */
  cardinalityBehavior?: 'single' | 'multiple';
  /** Description of the activity to be performed */
  definitionCanonical?: FhirCanonical;
  definitionUri?: string;
  /** Transform to apply the template */
  transform?: FhirCanonical;
  /** Dynamic aspects of the definition */
  dynamicValue?: FhirPlanDefinitionActionDynamicValue[];
  /** A sub-action */
  action?: FhirPlanDefinitionAction[];
}

// ─── PlanDefinition.goal ─────────────────────────────────────────────────────

/** Goals of the plan */
export interface FhirPlanDefinitionGoal extends FhirBackboneElement {
  /** E.g. Treatment, Support, Maintenance */
  category?: FhirCodeableConcept;
  /** Code or text describing the goal */
  description: FhirCodeableConcept;
  /** high-priority | medium-priority | low-priority */
  priority?: FhirCodeableConcept;
  /** When goal pursuit begins */
  start?: FhirCodeableConcept;
  /** What does the goal address */
  addresses?: FhirCodeableConcept[];
  /** Supporting documentation for the goal */
  documentation?: FhirRelatedArtifact[];
  /** Target outcome for the goal */
  target?: Array<{
    measure?: FhirCodeableConcept;
    detailQuantity?: unknown;
    detailRange?: unknown;
    detailCodeableConcept?: FhirCodeableConcept;
    detailString?: string;
    detailBoolean?: boolean;
    detailInteger?: number;
    detailRatio?: unknown;
    due?: unknown;
  }>;
}

// ─── PlanDefinition ──────────────────────────────────────────────────────────

/**
 * This resource allows for the definition of various types of plans.
 * Maps to OpenGRADE Recommendation.
 */
export interface FhirPlanDefinition extends FhirDomainResource {
  resourceType: 'PlanDefinition';

  /** Canonical identifier for this plan definition */
  url?: string;
  /** Additional identifier for the plan definition */
  identifier?: FhirIdentifier[];
  /** Business version of the plan definition */
  version?: string;
  /** How to compare versions */
  versionAlgorithmString?: string;
  versionAlgorithmCoding?: unknown;
  /** Name for this plan definition (computer friendly) */
  name?: string;
  /** Name for this plan definition (human friendly) */
  title?: string;
  /** Subordinate title of the plan definition */
  subtitle?: string;
  /** order-set | clinical-protocol | eca-rule | workflow-definition */
  type?: FhirCodeableConcept;
  /** draft | active | retired | unknown */
  status: 'draft' | 'active' | 'retired' | 'unknown';
  /** For testing purposes, not real usage */
  experimental?: boolean;
  /** Type of individual the plan definition is focused on */
  subjectCodeableConcept?: FhirCodeableConcept;
  subjectReference?: FhirReference;
  subjectCanonical?: FhirCanonical;
  /** Date last changed */
  date?: FhirDateTime;
  /** Name of the publisher/steward */
  publisher?: string;
  /** Contact details for the publisher */
  contact?: FhirContactDetail[];
  /** Natural language description of the plan definition */
  description?: FhirMarkdown;
  /** The context that the content is intended to support */
  useContext?: FhirUsageContext[];
  /** Intended jurisdiction for plan definition */
  jurisdiction?: FhirCodeableConcept[];
  /** Why this plan definition is defined */
  purpose?: FhirMarkdown;
  /** Describes the clinical usage of the plan */
  usage?: FhirMarkdown;
  /** Use and/or publishing restrictions */
  copyright?: FhirMarkdown;
  /** Copyright holder and year(s) */
  copyrightLabel?: string;
  /** When the plan definition was approved by publisher */
  approvalDate?: string;
  /** When the plan definition was last reviewed by the publisher */
  lastReviewDate?: string;
  /** When the plan definition is expected to be used */
  effectivePeriod?: FhirPeriod;
  /** E.g. Education, Treatment, Assessment */
  topic?: FhirCodeableConcept[];
  /** Who authored the content */
  author?: FhirContactDetail[];
  /** Who edited the content */
  editor?: FhirContactDetail[];
  /** Who reviewed the content */
  reviewer?: FhirContactDetail[];
  /** Who endorsed the content */
  endorser?: FhirContactDetail[];
  /** Additional documentation, citations */
  relatedArtifact?: FhirRelatedArtifact[];
  /** Logic used by the plan definition */
  library?: FhirCanonical[];
  /** What the plan is trying to accomplish */
  goal?: FhirPlanDefinitionGoal[];
  /** Actors within the plan */
  actor?: Array<{
    title?: string;
    description?: FhirMarkdown;
    option: Array<{
      type?: FhirCode;
      typeCanonical?: FhirCanonical;
      typeReference?: FhirReference;
      role?: FhirCodeableConcept;
    }>;
  }>;
  /** Action defined by the plan */
  action?: FhirPlanDefinitionAction[];
  /** Extensions for GRADE-specific metadata */
  extension?: FhirExtension[];
}
