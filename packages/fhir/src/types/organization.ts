/**
 * FHIR R5 Organization Resource
 *
 * A formally or informally recognized grouping of people or organizations
 * formed for the purpose of achieving some form of collective action.
 * Includes companies, institutions, corporations, departments, community groups,
 * healthcare practice groups, payer/insurer, etc.
 *
 * Used in OpenGRADE to represent organizations that create or manage guidelines.
 *
 * @see https://hl7.org/fhir/R5/organization.html
 */

import type {
  FhirDomainResource,
  FhirIdentifier,
  FhirCodeableConcept,
  FhirReference,
  FhirExtension,
  FhirContactPoint,
  FhirAddress,
  FhirHumanName,
  FhirPeriod,
  FhirBackboneElement,
} from './base';

// ─── Organization.qualification ──────────────────────────────────────────────

/**
 * Qualifications, certifications, accreditations, licenses, training, etc.
 * pertaining to the provision of care.
 */
export interface FhirOrganizationQualification extends FhirBackboneElement {
  identifier?: FhirIdentifier[];
  code: FhirCodeableConcept;
  period?: FhirPeriod;
  issuer?: FhirReference;
}

// ─── Organization.contact ─────────────────────────────────────────────────────

/**
 * Official contact details for the organization.
 */
export interface FhirOrganizationContact extends FhirBackboneElement {
  /** The purpose of the contact */
  purpose?: FhirCodeableConcept;
  /** A name associated with the contact */
  name?: FhirHumanName;
  /** Contact details (telephone, email, etc.) for a contact */
  telecom?: FhirContactPoint[];
  /** Visiting or postal addresses for the contact */
  address?: FhirAddress;
}

// ─── Organization ────────────────────────────────────────────────────────────

/**
 * A formally or informally recognized grouping of people or organizations.
 * Maps to OpenGRADE organizations that produce guidelines.
 */
export interface FhirOrganization extends FhirDomainResource {
  resourceType: 'Organization';

  /** Identifies this organization across multiple systems */
  identifier?: FhirIdentifier[];
  /** Whether the organization's record is still in active use */
  active?: boolean;
  /** Kind of organization */
  type?: FhirCodeableConcept[];
  /** Name used for the organization */
  name?: string;
  /** A list of alternate names that the organization is known as, or was known as in the past */
  alias?: string[];
  /** Additional details about the Organization that could be displayed as further information */
  description?: string;
  /** Official contact details for the Organization */
  contact?: FhirOrganizationContact[];
  /** The organization of which this organization forms a part */
  partOf?: FhirReference;
  /** Technical endpoints providing access to services operated for the organization */
  endpoint?: FhirReference[];
  /** Qualifications, certifications, accreditations, licenses, training, etc. */
  qualification?: FhirOrganizationQualification[];
  /** Extensions for OpenGRADE-specific metadata */
  extension?: FhirExtension[];
}
