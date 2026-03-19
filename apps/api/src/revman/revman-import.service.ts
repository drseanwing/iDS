import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RevManData, RevManOutcome } from './revman-parser.service';

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class RevmanImportService {
  private readonly logger = new Logger(RevmanImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Import parsed RevMan data into the database as Outcome records.
   *
   * Each RevMan outcome (from any comparison) becomes one Outcome row
   * linked to the specified PICO.  Outcomes are de-duplicated by title
   * within the same PICO — if an outcome with the same title already
   * exists (and is not soft-deleted) it is skipped.
   *
   * All inserts are wrapped in a single Prisma transaction so that a
   * failure mid-import does not leave partial data.
   */
  async importToGuideline(
    guidelineId: string,
    picoId: string,
    data: RevManData,
  ): Promise<ImportResult> {
    // Verify the PICO exists and belongs to the guideline
    const pico = await this.prisma.pico.findUnique({ where: { id: picoId } });
    if (!pico) throw new NotFoundException(`PICO ${picoId} not found`);
    if (pico.guidelineId !== guidelineId) {
      throw new NotFoundException(`PICO ${picoId} does not belong to guideline ${guidelineId}`);
    }

    // Load existing outcome titles for this PICO (for skip detection)
    const existing = await this.prisma.outcome.findMany({
      where: { picoId, isDeleted: false },
      select: { title: true },
    });
    const existingTitles = new Set(existing.map((o) => o.title.toLowerCase()));

    // Flatten all outcomes from all comparisons
    const outcomesToCreate = this.flattenOutcomes(data, existingTitles);

    const result: ImportResult = {
      created: 0,
      skipped: outcomesToCreate.skipped,
      errors: [],
    };

    if (outcomesToCreate.records.length === 0) {
      return result;
    }

    // Determine starting ordering value
    const maxOrdering = await this.prisma.outcome.aggregate({
      where: { picoId, isDeleted: false },
      _max: { ordering: true },
    });
    let orderingBase = (maxOrdering._max.ordering ?? -1) + 1;

    // Insert all records in a single transaction
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const record of outcomesToCreate.records) {
          await tx.outcome.create({
            data: {
              picoId,
              title: record.title,
              outcomeType: record.outcomeType,
              effectMeasure: record.effectMeasure,
              relativeEffect: record.relativeEffect,
              relativeEffectLower: record.relativeEffectLower,
              relativeEffectUpper: record.relativeEffectUpper,
              interventionParticipants: record.interventionParticipants,
              comparisonParticipants: record.comparisonParticipants,
              numberOfStudies: record.numberOfStudies,
              ordering: orderingBase++,
            },
          });
          result.created++;
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`RevMan import transaction failed: ${message}`);
      result.errors.push(`Transaction failed: ${message}`);
      result.created = 0;
    }

    return result;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private flattenOutcomes(
    data: RevManData,
    existingTitles: Set<string>,
  ): { records: OutcomeRecord[]; skipped: number } {
    const records: OutcomeRecord[] = [];
    let skipped = 0;

    for (const comparison of data.comparisons) {
      for (const outcome of comparison.outcomes) {
        // Prefix with comparison name so titles stay unique across comparisons
        const title = `${comparison.name}: ${outcome.name}`;

        if (existingTitles.has(title.toLowerCase())) {
          skipped++;
          continue;
        }
        existingTitles.add(title.toLowerCase()); // prevent duplicates within this import batch

        records.push(this.buildOutcomeRecord(title, outcome));
      }
    }

    return { records, skipped };
  }

  private buildOutcomeRecord(title: string, outcome: RevManOutcome): OutcomeRecord {
    const isDich = outcome.type === 'DICHOTOMOUS';

    // Aggregate participant counts from study data when not in overall effect
    const totalIntervention = outcome.studies.reduce(
      (sum, s) => sum + (s.totalIntervention ?? 0),
      0,
    );
    const totalControl = outcome.studies.reduce(
      (sum, s) => sum + (s.totalControl ?? 0),
      0,
    );

    return {
      title,
      outcomeType: outcome.type,
      effectMeasure: isDich ? 'RR' : 'MD',
      relativeEffect: outcome.overallEffect?.effect,
      relativeEffectLower: outcome.overallEffect?.ciLower,
      relativeEffectUpper: outcome.overallEffect?.ciUpper,
      interventionParticipants:
        outcome.overallEffect?.totalParticipants != null
          ? undefined // will use total from overall if available
          : totalIntervention > 0
            ? totalIntervention
            : undefined,
      comparisonParticipants: totalControl > 0 ? totalControl : undefined,
      numberOfStudies:
        outcome.overallEffect?.totalStudies ?? outcome.studies.length,
    };
  }
}

interface OutcomeRecord {
  title: string;
  outcomeType: 'DICHOTOMOUS' | 'CONTINUOUS';
  effectMeasure: 'RR' | 'MD';
  relativeEffect?: number;
  relativeEffectLower?: number;
  relativeEffectUpper?: number;
  interventionParticipants?: number;
  comparisonParticipants?: number;
  numberOfStudies?: number;
}
