/**
 * FHIR R5 Bundle Resource
 *
 * A container for a collection of resources. Used for document, transaction,
 * search results, history, and other groupings of FHIR resources.
 *
 * @see https://hl7.org/fhir/R5/bundle.html
 */

import type {
  FhirResource,
  FhirIdentifier,
  FhirBackboneElement,
  FhirUri,
  FhirInstant,
} from './base';

// ─── Bundle.link ─────────────────────────────────────────────────────────────

/**
 * A series of links that provide context to this bundle.
 */
export interface FhirBundleLink extends FhirBackboneElement {
  /** See http://www.iana.org/assignments/link-relations/link-relations.xhtml#link-relations-1 */
  relation: string;
  /** Reference details for the link */
  url: FhirUri;
}

// ─── Bundle.entry.search ─────────────────────────────────────────────────────

/**
 * Information about the search process that led to the inclusion of this entry.
 */
export interface FhirBundleEntrySearch extends FhirBackboneElement {
  /** match | include | outcome */
  mode?: 'match' | 'include' | 'outcome';
  /** Search ranking (0-1) */
  score?: number;
}

// ─── Bundle.entry.request ─────────────────────────────────────────────────────

/**
 * Additional information about how this entry should be processed as part of a transaction.
 */
export interface FhirBundleEntryRequest extends FhirBackboneElement {
  /** GET | HEAD | POST | PUT | DELETE | PATCH */
  method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** URL for HTTP equivalent of this entry */
  url: FhirUri;
  /** For managing cache validation */
  ifNoneMatch?: string;
  /** For managing update contention */
  ifModifiedSince?: FhirInstant;
  /** For managing update contention */
  ifMatch?: string;
  /** For conditional creates */
  ifNoneExist?: string;
}

// ─── Bundle.entry.response ────────────────────────────────────────────────────

/**
 * Results of execution (transaction/batch/history).
 */
export interface FhirBundleEntryResponse extends FhirBackboneElement {
  /** Status response code (text optional) */
  status: string;
  /** The location (if the operation returns a location) */
  location?: FhirUri;
  /** The Etag for the resource (if relevant) */
  etag?: string;
  /** Server's date time modified */
  lastModified?: FhirInstant;
  /** OperationOutcome with hints and warnings */
  outcome?: FhirResource;
}

// ─── Bundle.entry ─────────────────────────────────────────────────────────────

/**
 * Entry in the bundle, containing a resource or information about a resource.
 */
export interface FhirBundleEntry<TResource extends FhirResource = FhirResource>
  extends FhirBackboneElement {
  /** Links related to this entry */
  link?: FhirBundleLink[];
  /** URI for resource (Absolute URL server address, or URI for UUID/OID) */
  fullUrl?: FhirUri;
  /** A resource in the bundle */
  resource?: TResource;
  /** Search related information */
  search?: FhirBundleEntrySearch;
  /** Additional execution information (transaction/batch/history) */
  request?: FhirBundleEntryRequest;
  /** Results of execution (transaction/batch/history) */
  response?: FhirBundleEntryResponse;
}

// ─── Bundle ──────────────────────────────────────────────────────────────────

/**
 * A container for a collection of resources.
 */
export interface FhirBundle<TResource extends FhirResource = FhirResource>
  extends FhirResource {
  resourceType: 'Bundle';

  /** Persistent identifier for the bundle */
  identifier?: FhirIdentifier;
  /**
   * document | message | transaction | transaction-response | batch | batch-response
   * | history | searchset | collection | subscription-notification
   */
  type:
    | 'document'
    | 'message'
    | 'transaction'
    | 'transaction-response'
    | 'batch'
    | 'batch-response'
    | 'history'
    | 'searchset'
    | 'collection'
    | 'subscription-notification';
  /** When the bundle was assembled */
  timestamp?: FhirInstant;
  /** If search, the total number of matches */
  total?: number;
  /** Links related to this Bundle */
  link?: FhirBundleLink[];
  /** Entry in the bundle, with relative/absolute resource URL */
  entry?: FhirBundleEntry<TResource>[];
  /** Digital Signature */
  signature?: {
    type: Array<{ system?: string; code?: string; display?: string }>;
    when: FhirInstant;
    who: { reference?: string; display?: string };
    onBehalfOf?: { reference?: string; display?: string };
    targetFormat?: string;
    sigFormat?: string;
    data?: string;
  };
  /** Issues with the Bundle */
  issues?: FhirResource;
}
