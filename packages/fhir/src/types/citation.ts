/**
 * FHIR R5 Citation Resource
 *
 * The Citation resource enables reference to any knowledge artifact for purposes of
 * identification and attribution. The Citation resource supports existing reference
 * structures and developing publication practices such as versioning, expressing complex
 * contributorship roles, and referencing computable resources.
 *
 * Used in OpenGRADE to represent bibliographic References.
 *
 * @see https://hl7.org/fhir/R5/citation.html
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
  FhirPeriod,
  FhirAttachment,
  FhirDateTime,
  FhirBackboneElement,
} from './base';

// ─── CitedArtifact sub-types ──────────────────────────────────────────────────

/** Title information for the cited artifact */
export interface FhirCitedArtifactTitle extends FhirBackboneElement {
  type?: FhirCodeableConcept[];
  language?: FhirCodeableConcept;
  text: string;
}

/** Abstract information for the cited artifact */
export interface FhirCitedArtifactAbstract extends FhirBackboneElement {
  type?: FhirCodeableConcept;
  language?: FhirCodeableConcept;
  text: FhirMarkdown;
  copyright?: FhirMarkdown;
}

/** Part information for the cited artifact */
export interface FhirCitedArtifactPart extends FhirBackboneElement {
  type?: FhirCodeableConcept;
  value?: string;
  baseCitation?: FhirReference;
}

/** Web location for the cited artifact */
export interface FhirCitedArtifactWebLocation extends FhirBackboneElement {
  classifier?: FhirCodeableConcept[];
  url?: string;
}

/** Publication form for the cited artifact */
export interface FhirCitedArtifactPublicationForm extends FhirBackboneElement {
  publishedIn?: {
    type?: FhirCodeableConcept;
    identifier?: FhirIdentifier[];
    title?: string;
    publisher?: FhirReference;
    publisherLocation?: string;
  };
  citedMedium?: FhirCodeableConcept;
  volume?: string;
  issue?: string;
  articleDate?: FhirDateTime;
  publicationDateText?: string;
  publicationDateSeason?: string;
  lastRevisionDate?: FhirDateTime;
  language?: FhirCodeableConcept[];
  accessionNumber?: string;
  pageString?: string;
  firstPage?: string;
  lastPage?: string;
  pageCount?: string;
  copyright?: FhirMarkdown;
}

/** Classification of the cited artifact */
export interface FhirCitedArtifactClassification extends FhirBackboneElement {
  type?: FhirCodeableConcept;
  classifier?: FhirCodeableConcept[];
  artifactAssessment?: FhirReference[];
}

/** Contribution instance in contributorship */
export interface FhirCitedArtifactContributorshipEntry extends FhirBackboneElement {
  contributor: FhirReference;
  forenameInitials?: string;
  affiliation?: FhirReference[];
  contributionType?: FhirCodeableConcept[];
  role?: FhirCodeableConcept;
  contributionInstance?: Array<{
    type: FhirCodeableConcept;
    time?: FhirDateTime;
  }>;
  correspondingContact?: boolean;
  rankingOrder?: number;
}

/** Attribution of authorship/contributorship */
export interface FhirCitedArtifactContributorship extends FhirBackboneElement {
  complete?: boolean;
  entry?: FhirCitedArtifactContributorshipEntry[];
  summary?: Array<{
    type?: FhirCodeableConcept;
    style?: FhirCodeableConcept;
    source?: FhirCodeableConcept;
    value: FhirMarkdown;
  }>;
}

/**
 * The article or artifact being cited.
 */
export interface FhirCitedArtifact extends FhirBackboneElement {
  /** The formal identifier for the article or artifact */
  identifier?: FhirIdentifier[];
  /** The related identifier for the article or artifact */
  relatedIdentifier?: FhirIdentifier[];
  /** When the cited artifact was accessed */
  dateAccessed?: FhirDateTime;
  /** Version(s) of the artifact */
  version?: {
    value: string;
    baseCitation?: FhirReference;
  };
  /** The status of the cited artifact */
  currentState?: FhirCodeableConcept[];
  /** An effective date or period for a status of the cited artifact */
  statusDate?: Array<{
    activity: FhirCodeableConcept;
    actual?: boolean;
    period: FhirPeriod;
  }>;
  /** The title details of the article or artifact */
  title?: FhirCitedArtifactTitle[];
  /** Summary of the article or artifact */
  abstract?: FhirCitedArtifactAbstract[];
  /** The component of the article or artifact */
  part?: FhirCitedArtifactPart;
  /** The artifact related to the cited artifact */
  relatesTo?: FhirRelatedArtifact[];
  /** If multiple, used to represent alternative forms of the article */
  publicationForm?: FhirCitedArtifactPublicationForm[];
  /** Used for any URL for the article or artifact cited */
  webLocation?: FhirCitedArtifactWebLocation[];
  /** The assignment to an organizing scheme */
  classification?: FhirCitedArtifactClassification[];
  /** Attribution of authors and other contributors */
  contributorship?: FhirCitedArtifactContributorship;
  /** Any additional information or content for the article or artifact */
  note?: FhirAnnotation[];
}

// ─── Citation ────────────────────────────────────────────────────────────────

/**
 * The Citation resource enables reference to any knowledge artifact for identification
 * and attribution. Maps to OpenGRADE Reference.
 */
export interface FhirCitation extends FhirDomainResource {
  resourceType: 'Citation';

  /** Canonical identifier for this citation */
  url?: string;
  /** Identifier for the Citation resource itself */
  identifier?: FhirIdentifier[];
  /** Business version of the citation */
  version?: string;
  /** Name for this citation (machine readable) */
  name?: string;
  /** Name for this citation (human friendly) */
  title?: string;
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
  /** Natural language description of the citation */
  description?: FhirMarkdown;
  /** The context that the content is intended to support */
  useContext?: Array<{
    code: { system?: string; code?: string };
    valueCodeableConcept?: FhirCodeableConcept;
  }>;
  /** Intended jurisdiction for citation */
  jurisdiction?: FhirCodeableConcept[];
  /** Why this citation is defined */
  purpose?: FhirMarkdown;
  /** Use and/or publishing restrictions */
  copyright?: FhirMarkdown;
  /** Copyright holder and year(s) */
  copyrightLabel?: string;
  /** When the citation was approved by publisher */
  approvalDate?: string;
  /** When the citation was last reviewed by the publisher */
  lastReviewDate?: string;
  /** When the citation is expected to be used */
  effectivePeriod?: FhirPeriod;
  /** Who authored the content */
  author?: FhirContactDetail[];
  /** Who edited the content */
  editor?: FhirContactDetail[];
  /** Who reviewed the content */
  reviewer?: FhirContactDetail[];
  /** Who endorsed the content */
  endorser?: FhirContactDetail[];
  /** A human-readable display of key concepts to represent the citation */
  summary?: Array<{
    style?: FhirCodeableConcept;
    text: FhirMarkdown;
  }>;
  /** The assignment to an organizing scheme */
  classification?: Array<{
    type?: FhirCodeableConcept;
    classifier?: FhirCodeableConcept[];
  }>;
  /** Used for general notes and annotations not coded elsewhere */
  note?: FhirAnnotation[];
  /** The status of the citation */
  currentState?: FhirCodeableConcept[];
  /** An effective date or period for a status of the citation */
  statusDate?: Array<{
    activity: FhirCodeableConcept;
    actual?: boolean;
    period: FhirPeriod;
  }>;
  /** Artifact related to the Citation Resource */
  relatesTo?: FhirRelatedArtifact[];
  /** The article or artifact being cited */
  citedArtifact?: FhirCitedArtifact;
  /** Extensions for OpenGRADE-specific metadata */
  extension?: FhirExtension[];
}
