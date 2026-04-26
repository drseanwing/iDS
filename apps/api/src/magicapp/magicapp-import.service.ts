import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CertaintyLevel, RecommendationStrength } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { MagicAppExport, MagicAppRecommendation } from './magicapp-parser.service';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ImportResult {
  created: {
    sections: number;
    recommendations: number;
    references: number;
  };
  skipped: number;
  errors: string[];
}

/** Nil UUID used as the author placeholder for system-generated records. */
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// ── Mappings ───────────────────────────────────────────────────────────────

function mapRecommendationStrength(
  strength: MagicAppRecommendation['strength'],
): RecommendationStrength {
  switch (strength) {
    case 'STRONG_FOR':
      return RecommendationStrength.STRONG_FOR;
    case 'WEAK_FOR':
      return RecommendationStrength.CONDITIONAL_FOR;
    case 'STRONG_AGAINST':
      return RecommendationStrength.STRONG_AGAINST;
    case 'WEAK_AGAINST':
      return RecommendationStrength.CONDITIONAL_AGAINST;
    case 'BEST_PRACTICE':
      return RecommendationStrength.STRONG_FOR;
    default:
      return RecommendationStrength.NOT_SET;
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
export class MagicAppImportService {
  private readonly logger = new Logger(MagicAppImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Import a parsed MagicApp export into the database.
   *
   * For each top-level section in the export:
   *  - A new Section is created (guidelineId, title, text as TipTap JSON)
   *  - Each subsection is created with parentId set to the parent section
   *  - Each recommendation in a subsection is linked to the guideline
   *  - Each reference on a recommendation is created for the guideline
   *
   * Sections without a title are skipped.
   * All writes are wrapped in a single transaction.
   */
  async importToGuideline(
    guidelineId: string,
    data: MagicAppExport,
  ): Promise<ImportResult> {
    // Verify the guideline exists
    const guideline = await this.prisma.guideline.findUnique({ where: { id: guidelineId } });
    if (!guideline) throw new NotFoundException(`Guideline ${guidelineId} not found`);

    const result: ImportResult = {
      created: { sections: 0, recommendations: 0, references: 0 },
      skipped: 0,
      errors: [],
    };

    const sections = data.sections ?? [];
    if (sections.length === 0) {
      return result;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const section of sections) {
          // Skip sections with no title
          if (!section.title) {
            result.skipped++;
            continue;
          }

          // Create top-level section
          const parentSection = await tx.section.create({
            data: {
              guidelineId,
              title: section.title,
              text: toTipTapDoc(section.content ?? ''),
              nestingLevel: 0,
            },
          });
          result.created.sections++;

          const subsections = section.subsections ?? [];
          for (const subsection of subsections) {
            // Skip subsections with no title
            if (!subsection.title) {
              result.skipped++;
              continue;
            }

            // Create subsection with parent
            const childSection = await tx.section.create({
              data: {
                guidelineId,
                title: subsection.title,
                text: toTipTapDoc(subsection.content ?? ''),
                parentId: parentSection.id,
                nestingLevel: 1,
              },
            });
            result.created.sections++;

            const recommendations = subsection.recommendations ?? [];
            for (const rec of recommendations) {
              const text = rec.text ?? '';
              await tx.recommendation.create({
                data: {
                  guidelineId,
                  description: toTipTapDoc(text),
                  strength: mapRecommendationStrength(rec.strength),
                  certaintyOfEvidence: mapCertainty(rec.certainty),
                  createdBy: SYSTEM_USER_ID,
                  updatedBy: SYSTEM_USER_ID,
                },
              });
              result.created.recommendations++;

              // Create references for this recommendation
              const references = rec.references ?? [];
              for (const ref of references) {
                await tx.reference.create({
                  data: {
                    guidelineId,
                    title: ref.title ?? 'Untitled reference',
                    doi: ref.doi ?? null,
                    year: ref.year ?? null,
                  },
                });
                result.created.references++;
              }
            }
          }
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`MagicApp import transaction failed: ${message}`);
      result.errors.push(`Transaction failed: ${message}`);
      result.created = { sections: 0, recommendations: 0, references: 0 };
    }

    return result;
  }
}
