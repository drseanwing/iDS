import { Injectable } from '@nestjs/common';

/**
 * Projects an internal Recommendation to a FHIR R5 PlanDefinition resource.
 *
 * @see https://hl7.org/fhir/R5/plandefinition.html
 */
@Injectable()
export class RecommendationPlanDefinitionProjection {
  toPlanDefinition(recommendation: any): object {
    const extensions: object[] = [];

    // GRADE recommendation strength extension
    if (recommendation.strength && recommendation.strength !== 'NOT_SET') {
      extensions.push({
        url: 'http://hl7.org/fhir/StructureDefinition/cqf-strengthOfRecommendation',
        valueCodeableConcept: {
          coding: [
            {
              system: 'urn:opengrade:recommendation-strength',
              code: recommendation.strength,
              display: this.mapStrengthDisplay(recommendation.strength),
            },
          ],
        },
      });
    }

    // GRADE certainty of evidence extension
    if (recommendation.certaintyOfEvidence) {
      extensions.push({
        url: 'http://hl7.org/fhir/StructureDefinition/cqf-qualityOfEvidence',
        valueCodeableConcept: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/evidence-quality',
              code: this.mapCertaintyCode(recommendation.certaintyOfEvidence),
              display: recommendation.certaintyOfEvidence,
            },
          ],
        },
      });
    }

    const resource: any = {
      resourceType: 'PlanDefinition',
      id: recommendation.id,
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/PlanDefinition'],
      },
      status: this.mapRecStatus(recommendation.recStatus),
      title: recommendation.title ?? undefined,
      type: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/plan-definition-type',
            code: 'eca-rule',
            display: 'ECA Rule',
          },
        ],
      },
      date: recommendation.updatedAt?.toISOString?.() ?? recommendation.updatedAt,
      description:
        typeof recommendation.description === 'string'
          ? recommendation.description
          : recommendation.description
            ? JSON.stringify(recommendation.description)
            : undefined,
    };

    if (extensions.length > 0) {
      resource.extension = extensions;
    }

    // Recommendation type classification
    if (recommendation.recommendationType) {
      resource.useContext = [
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'program',
          },
          valueCodeableConcept: {
            coding: [
              {
                system: 'urn:opengrade:recommendation-type',
                code: recommendation.recommendationType,
              },
            ],
          },
        },
      ];
    }

    // Rationale
    if (recommendation.rationale) {
      resource.purpose =
        typeof recommendation.rationale === 'string'
          ? recommendation.rationale
          : JSON.stringify(recommendation.rationale);
    }

    return resource;
  }

  private mapRecStatus(
    status: string,
  ): 'draft' | 'active' | 'retired' | 'unknown' {
    switch (status) {
      case 'REVIEWED':
        return 'active';
      case 'POSSIBLY_OUTDATED':
        return 'retired';
      case 'NEW':
      case 'UPDATED':
      case 'IN_REVIEW':
      case 'UPDATED_EVIDENCE':
        return 'draft';
      default:
        return 'unknown';
    }
  }

  private mapStrengthDisplay(strength: string): string {
    switch (strength) {
      case 'STRONG_FOR':
        return 'Strong recommendation for';
      case 'CONDITIONAL_FOR':
        return 'Conditional recommendation for';
      case 'CONDITIONAL_AGAINST':
        return 'Conditional recommendation against';
      case 'STRONG_AGAINST':
        return 'Strong recommendation against';
      default:
        return strength;
    }
  }

  private mapCertaintyCode(certainty: string): string {
    switch (certainty) {
      case 'HIGH':
        return 'high';
      case 'MODERATE':
        return 'moderate';
      case 'LOW':
        return 'low';
      case 'VERY_LOW':
        return 'very-low';
      default:
        return certainty.toLowerCase();
    }
  }
}
