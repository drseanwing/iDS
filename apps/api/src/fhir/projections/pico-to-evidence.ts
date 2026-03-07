import { Injectable } from '@nestjs/common';

/**
 * Projects an internal PICO (with outcomes) to a FHIR R5 Evidence resource.
 *
 * @see https://hl7.org/fhir/R5/evidence.html
 */
@Injectable()
export class PicoEvidenceProjection {
  toEvidence(pico: any): object {
    const outcomes: any[] = (pico.outcomes ?? []).filter(
      (o: any) => !o.isDeleted && !o.isShadow,
    );

    const resource: any = {
      resourceType: 'Evidence',
      id: pico.id,
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Evidence'],
      },
      status: 'active',
      title: `${pico.population}: ${pico.intervention} vs ${pico.comparator}`,
      date: pico.updatedAt?.toISOString?.() ?? pico.updatedAt,
      variableDefinition: this.buildVariableDefinitions(pico),
    };

    // Map outcomes to statistics
    const statistics = outcomes
      .map((o: any) => this.mapOutcomeToStatistic(o))
      .filter(Boolean);

    if (statistics.length > 0) {
      resource.statistic = statistics;
    }

    // Narrative summary
    if (pico.narrativeSummary) {
      resource.description =
        typeof pico.narrativeSummary === 'string'
          ? pico.narrativeSummary
          : JSON.stringify(pico.narrativeSummary);
    }

    // PICO codes as additional classifications
    if (pico.codes && pico.codes.length > 0) {
      resource.note = [
        {
          text: `Coded elements: ${pico.codes.map((c: any) => `${c.element}=${c.codeSystem}:${c.code} (${c.display})`).join('; ')}`,
        },
      ];
    }

    return resource;
  }

  private buildVariableDefinitions(pico: any): object[] {
    return [
      {
        variableRole: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/variable-role',
              code: 'population',
              display: 'Population',
            },
          ],
        },
        observed: {
          display: pico.population,
        },
      },
      {
        variableRole: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/variable-role',
              code: 'exposure',
              display: 'Exposure',
            },
          ],
        },
        observed: {
          display: pico.intervention,
        },
      },
      {
        variableRole: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/variable-role',
              code: 'referenceExposure',
              display: 'Reference Exposure',
            },
          ],
        },
        observed: {
          display: pico.comparator,
        },
      },
    ];
  }

  private mapOutcomeToStatistic(outcome: any): object | null {
    const stat: any = {
      description: outcome.title,
    };

    // Outcome type as statisticType
    stat.statisticType = {
      coding: [
        {
          system: 'urn:opengrade:outcome-type',
          code: outcome.outcomeType,
        },
      ],
    };

    // Effect measure and estimate
    if (outcome.effectMeasure && outcome.relativeEffect != null) {
      stat.quantity = {
        value: outcome.relativeEffect,
      };

      stat.statisticType = {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/statistic-type',
            code: this.mapEffectMeasureCode(outcome.effectMeasure),
            display: outcome.effectMeasure,
          },
        ],
      };

      // Confidence interval
      if (
        outcome.relativeEffectLower != null &&
        outcome.relativeEffectUpper != null
      ) {
        stat.attributeEstimate = [
          {
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/attribute-estimate-type',
                  code: 'C53324',
                  display: 'Confidence interval',
                },
              ],
            },
            range: {
              low: { value: outcome.relativeEffectLower },
              high: { value: outcome.relativeEffectUpper },
            },
          },
        ];
      }
    }

    // Sample size
    if (outcome.numberOfStudies != null || outcome.interventionParticipants != null) {
      stat.sampleSize = {};
      if (outcome.numberOfStudies != null) {
        stat.sampleSize.numberOfStudies = outcome.numberOfStudies;
      }
      if (outcome.interventionParticipants != null || outcome.comparisonParticipants != null) {
        stat.sampleSize.numberOfParticipants =
          (outcome.interventionParticipants ?? 0) +
          (outcome.comparisonParticipants ?? 0);
      }
    }

    // GRADE certainty ratings
    const certaintyComponents = this.buildCertaintyComponents(outcome);
    if (certaintyComponents.length > 0 || outcome.certaintyOverall) {
      stat.modelCharacteristic = [
        {
          code: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/statistic-model-code',
                code: 'overall',
                display: 'Overall certainty',
              },
            ],
          },
          value: outcome.certaintyOverall
            ? {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/certainty-rating',
                    code: this.mapCertaintyRating(outcome.certaintyOverall),
                    display: outcome.certaintyOverall,
                  },
                ],
              }
            : undefined,
        },
      ];
    }

    return stat;
  }

  private mapEffectMeasureCode(measure: string): string {
    const map: Record<string, string> = {
      RR: 'C93152',
      OR: 'C16932',
      HR: 'C93150',
      MD: 'C53319',
      SMD: 'C53321',
      PROTECTIVE_EFFICACY: 'C53319',
    };
    return map[measure] ?? measure;
  }

  private mapCertaintyRating(level: string): string {
    const map: Record<string, string> = {
      HIGH: 'high',
      MODERATE: 'moderate',
      LOW: 'low',
      VERY_LOW: 'very-low',
    };
    return map[level] ?? level.toLowerCase();
  }

  private buildCertaintyComponents(outcome: any): object[] {
    const components: object[] = [];
    const domains = [
      { field: 'riskOfBias', code: 'RiskOfBias', display: 'Risk of bias' },
      { field: 'inconsistency', code: 'Inconsistency', display: 'Inconsistency' },
      { field: 'indirectness', code: 'Indirectness', display: 'Indirectness' },
      { field: 'imprecision', code: 'Imprecision', display: 'Imprecision' },
      { field: 'publicationBias', code: 'PublicationBias', display: 'Publication bias' },
    ];

    for (const domain of domains) {
      const value = outcome[domain.field];
      if (value && value !== 'NOT_SERIOUS') {
        components.push({
          type: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/certainty-type',
                code: domain.code,
                display: domain.display,
              },
            ],
          },
          rating: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/certainty-rating',
                code: value === 'SERIOUS' ? 'downcode1' : 'downcode2',
                display: value,
              },
            ],
          },
        });
      }
    }

    return components;
  }
}
