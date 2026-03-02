/** FHIR R5 Meta type for resource metadata */
export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
  profile?: string[];
  tag?: FhirCoding[];
  security?: FhirCoding[];
}

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: FhirMeta;
}
