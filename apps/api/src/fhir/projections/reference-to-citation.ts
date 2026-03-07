import { Injectable } from '@nestjs/common';

/**
 * Projects an internal Reference to a FHIR R5 Citation resource.
 *
 * @see https://hl7.org/fhir/R5/citation.html
 */
@Injectable()
export class ReferenceCitationProjection {
  toCitation(reference: any): object {
    const citedArtifact: any = {};

    // Title
    citedArtifact.title = [{ text: reference.title }];

    // Abstract
    if (reference.abstract) {
      citedArtifact.abstract = [{ text: reference.abstract }];
    }

    // Publication form (journal / year)
    if (reference.year) {
      citedArtifact.publicationForm = [
        {
          publishedIn: {
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/published-in-type',
                  code: 'D020547',
                  display: 'Periodical',
                },
              ],
            },
          },
          articleDate: reference.year ? `${reference.year}` : undefined,
        },
      ];
    }

    // Web locations (DOI, PubMed, URL)
    const webLocations: object[] = [];

    if (reference.doi) {
      webLocations.push({
        classifier: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/artifact-url-classifier',
                code: 'doi-based',
                display: 'DOI Based',
              },
            ],
          },
        ],
        url: reference.doi.startsWith('http')
          ? reference.doi
          : `https://doi.org/${reference.doi}`,
      });
    }

    if (reference.pubmedId) {
      webLocations.push({
        classifier: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/artifact-url-classifier',
                code: 'pubmed',
                display: 'PubMed',
              },
            ],
          },
        ],
        url: `https://pubmed.ncbi.nlm.nih.gov/${reference.pubmedId}/`,
      });
    }

    if (reference.url) {
      webLocations.push({ url: reference.url });
    }

    if (webLocations.length > 0) {
      citedArtifact.webLocation = webLocations;
    }

    // Contributorship (authors)
    if (reference.authors) {
      citedArtifact.contributorship = {
        summary: [{ value: reference.authors }],
      };
    }

    // Classification by study type
    if (reference.studyType && reference.studyType !== 'OTHER') {
      citedArtifact.classification = [
        {
          type: {
            coding: [
              {
                system: 'urn:opengrade:study-type',
                code: reference.studyType,
              },
            ],
          },
        },
      ];
    }

    return {
      resourceType: 'Citation',
      id: reference.id,
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Citation'],
      },
      status: 'active',
      title: reference.title,
      date: reference.updatedAt?.toISOString?.() ?? reference.updatedAt,
      citedArtifact,
    };
  }
}
