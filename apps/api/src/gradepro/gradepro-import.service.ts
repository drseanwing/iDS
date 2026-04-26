import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GradeRating, RecommendationStrength, CertaintyLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { GradeProExport, GradeProOutcome, GradeProRecommendation } from './gradepro-parser.service';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ImportResult {
  created: {
    picos: number;
    outcomes: number;
    recommendations: number;
  };
  skipped: number;
  errors: string[];
}

/** Nil UUID used as the author placeholder for system-generated records. */
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// ── Mappings ───────────────────────────────────────────────────────────────

function mapGradeRating(
  value: 'NO_LIMITATION' | 'NO_SERIOUS' | 'SERIOUS' | 'VERY_SERIOUS' | undefined,
): GradeRating {
  switch (value) {
    case 'SERIOUS':
      return GradeRating.SERIOUS;
    case 'VERY_SERIOUS':
      return GradeRating.VERY_SERIOUS;
    default:
      return GradeRating.NOT_SERIOUS;
  }
}

function mapPublicationBias(
  value: 'NO_SUSPECTED' | 'SUSPECTED' | 'STRONGLY_SUSPECTED' | undefined,
): GradeRating {
  switch (value) {
    case 'SUSPECTED':
      return GradeRating.SERIOUS;
    case 'STRONGLY_SUSPECTED':
      return GradeRating.VERY_SERIOUS;
    default:
      return GradeRating.NOT_SERIOUS;
  }
}

function mapCertainty(
  value: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW' | undefined,
): CertaintyLevel | undefined {
  switch (value) {
    case 'HIGH':
      return CertaintyLevel.HIGH;
    case 'MODERATE':
      return CertaintyLevel.MODERATE;
    case 'LOW':
      return CertaintyLevel.LOW;
    case 'VERY_LOW':
      return CertaintyLevel.VERY_LOW;
    default:
      return undefined;
  }
}

function mapRecommendationStrength(
  direction: 'FOR' | 'AGAINST' | 'NEITHER' | undefined,
  strength: 'STRONG' | 'CONDITIONAL' | undefined,
): RecommendationStrength {
  if (direction === 'FOR') {
    return strength === 'STRONG'
      ? RecommendationStrength.STRONG_FOR
      : RecommendationStrength.CONDITIONAL_FOR;
  }
  if (direction === 'AGAINST') {
    return strength === 'STRONG'
      ? RecommendationStrength.STRONG_AGAINST
      : RecommendationStrength.CONDITIONAL_AGAINST;
  }
  return RecommendationStrength.NOT_SET;
}

/** Build a minimal TipTap-compatible document from a plain text string. */
function toTipTapDoc(text: string): object {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
}

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class GradeProImportService {
  private readonly logger = new Logger(GradeProImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Import a parsed GradePro export into the database.
   *
   * For each question in the export:
   *  - A new PICO is created (importSource = GRADEPRO)
   *  - Each outcome is linked to that PICO
   *  - Each recommendation is linked to the guideline
   *
   * Questions without both an id and question text are skipped.
   * All writes are wrapped in a single transaction.
   */
  async importToGuideline(
    guidelineId: string,
    data: GradeProExport,
  ): Promise<ImportResult> {
    // Verify the guideline exists
    const guideline = await this.prisma.guideline.findUnique({ where: { id: guidelineId } });
    if (!guideline) throw new NotFoundException(`Guideline ${guidelineId} not found`);

    const result: ImportResult = {
      created: { picos: 0, outcomes: 0, recommendations: 0 },
      skipped: 0,
      errors: [],
    };

    const questions = data.questions ?? [];
    if (questions.length === 0) {
      return result;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const question of questions) {
          // Skip malformed questions
          if (!question.id && !question.question) {
            result.skipped++;
            continue;
          }

          // Create PICO
          const pico = await tx.pico.create({
            data: {
              guidelineId,
              population: question.population ?? '',
              intervention: question.intervention ?? '',
              comparator: question.comparator ?? '',
              importSource: 'GRADEPRO',
            },
          });
          result.created.picos++;

          // Create outcomes
          const outcomes = question.outcomes ?? [];
          for (const outcome of outcomes) {
            const certaintySuggested = outcome.certainty;
            const comments = certaintySuggested
              ? `Certainty suggested by GradePro: ${certaintySuggested}`
              : undefined;

            await tx.outcome.create({
              data: {
                picoId: pico.id,
                title: outcome.name ?? 'Unnamed outcome',
                outcomeType: 'NARRATIVE',
                riskOfBias: mapGradeRating(outcome.riskOfBias),
                inconsistency: mapGradeRating(outcome.inconsistency),
                indirectness: mapGradeRating(outcome.indirectness),
                imprecision: mapGradeRating(outcome.imprecision),
                publicationBias: mapPublicationBias(outcome.publicationBias),
                certaintyOverall: mapCertainty(outcome.certainty),
                plainLanguageSummary: comments,
              },
            });
            result.created.outcomes++;
          }

          // Create recommendations
          const recommendations = question.recommendations ?? [];
          for (const rec of recommendations) {
            const text = rec.text ?? '';
            await tx.recommendation.create({
              data: {
                guidelineId,
                description: toTipTapDoc(text),
                strength: mapRecommendationStrength(rec.direction, rec.strength),
                createdBy: SYSTEM_USER_ID,
                updatedBy: SYSTEM_USER_ID,
              },
            });
            result.created.recommendations++;
          }
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`GradePro import transaction failed: ${message}`);
      result.errors.push(`Transaction failed: ${message}`);
      result.created = { picos: 0, outcomes: 0, recommendations: 0 };
    }

    return result;
  }
}
