import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateOutcomeDto } from './dto/create-outcome.dto';
import { UpdateOutcomeDto } from './dto/update-outcome.dto';

@Injectable()
export class OutcomesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOutcomeDto) {
    return this.prisma.outcome.create({
      data: {
        picoId: dto.picoId,
        title: dto.title,
        outcomeType: dto.outcomeType,
        importance: dto.importance,
        ordering: dto.ordering,
        effectMeasure: dto.effectMeasure,
        relativeEffect: dto.relativeEffect,
        relativeEffectLower: dto.relativeEffectLower,
        relativeEffectUpper: dto.relativeEffectUpper,
        baselineRisk: dto.baselineRisk,
        absoluteEffectIntervention: dto.absoluteEffectIntervention,
        absoluteEffectComparison: dto.absoluteEffectComparison,
        interventionParticipants: dto.interventionParticipants,
        comparisonParticipants: dto.comparisonParticipants,
        numberOfStudies: dto.numberOfStudies,
        continuousUnit: dto.continuousUnit,
        continuousScaleLower: dto.continuousScaleLower,
        continuousScaleUpper: dto.continuousScaleUpper,
        certaintyOverall: dto.certaintyOverall,
        riskOfBias: dto.riskOfBias,
        inconsistency: dto.inconsistency,
        indirectness: dto.indirectness,
        imprecision: dto.imprecision,
        publicationBias: dto.publicationBias,
        largeEffect: dto.largeEffect,
        doseResponse: dto.doseResponse,
        plausibleConfounding: dto.plausibleConfounding,
        plainLanguageSummary: dto.plainLanguageSummary,
      },
    });
  }

  async findByPico(picoId: string, page = 1, limit = 20) {
    const where = { picoId, isDeleted: false };
    const [data, total] = await Promise.all([
      this.prisma.outcome.findMany({
        where,
        orderBy: { ordering: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.outcome.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string) {
    const outcome = await this.prisma.outcome.findUnique({
      where: { id },
      include: {
        referenceLinks: true,
        shadows: true,
      },
    });
    if (!outcome) throw new NotFoundException(`Outcome ${id} not found`);
    return outcome;
  }

  async update(id: string, dto: UpdateOutcomeDto) {
    await this.findOne(id);
    const data: Prisma.OutcomeUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.outcomeType !== undefined) data.outcomeType = dto.outcomeType;
    if (dto.importance !== undefined) data.importance = dto.importance;
    if (dto.ordering !== undefined) data.ordering = dto.ordering;
    if (dto.effectMeasure !== undefined) data.effectMeasure = dto.effectMeasure;
    if (dto.relativeEffect !== undefined) data.relativeEffect = dto.relativeEffect;
    if (dto.relativeEffectLower !== undefined) data.relativeEffectLower = dto.relativeEffectLower;
    if (dto.relativeEffectUpper !== undefined) data.relativeEffectUpper = dto.relativeEffectUpper;
    if (dto.baselineRisk !== undefined) data.baselineRisk = dto.baselineRisk;
    if (dto.absoluteEffectIntervention !== undefined) data.absoluteEffectIntervention = dto.absoluteEffectIntervention;
    if (dto.absoluteEffectComparison !== undefined) data.absoluteEffectComparison = dto.absoluteEffectComparison;
    if (dto.interventionParticipants !== undefined) data.interventionParticipants = dto.interventionParticipants;
    if (dto.comparisonParticipants !== undefined) data.comparisonParticipants = dto.comparisonParticipants;
    if (dto.numberOfStudies !== undefined) data.numberOfStudies = dto.numberOfStudies;
    if (dto.continuousUnit !== undefined) data.continuousUnit = dto.continuousUnit;
    if (dto.continuousScaleLower !== undefined) data.continuousScaleLower = dto.continuousScaleLower;
    if (dto.continuousScaleUpper !== undefined) data.continuousScaleUpper = dto.continuousScaleUpper;
    if (dto.certaintyOverall !== undefined) data.certaintyOverall = dto.certaintyOverall;
    if (dto.riskOfBias !== undefined) data.riskOfBias = dto.riskOfBias;
    if (dto.inconsistency !== undefined) data.inconsistency = dto.inconsistency;
    if (dto.indirectness !== undefined) data.indirectness = dto.indirectness;
    if (dto.imprecision !== undefined) data.imprecision = dto.imprecision;
    if (dto.publicationBias !== undefined) data.publicationBias = dto.publicationBias;
    if (dto.largeEffect !== undefined) data.largeEffect = dto.largeEffect;
    if (dto.doseResponse !== undefined) data.doseResponse = dto.doseResponse;
    if (dto.plausibleConfounding !== undefined) data.plausibleConfounding = dto.plausibleConfounding;
    if (dto.plainLanguageSummary !== undefined) data.plainLanguageSummary = dto.plainLanguageSummary;
    return this.prisma.outcome.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.outcome.update({ where: { id }, data: { isDeleted: true } });
  }

  // ---------------------------------------------------------------------------
  // Shadow-outcome workflow
  // ---------------------------------------------------------------------------

  /**
   * Create a shadow (draft copy) of an existing outcome.
   * All evidence fields are duplicated; the shadow is linked back to the
   * original via `shadowOfId`.
   */
  async createShadow(outcomeId: string, userId: string) {
    const original = await this.prisma.outcome.findUnique({
      where: { id: outcomeId },
    });
    if (!original) {
      throw new NotFoundException(`Outcome ${outcomeId} not found`);
    }

    return this.prisma.outcome.create({
      data: {
        picoId: original.picoId,
        title: original.title,
        outcomeType: original.outcomeType,
        state: original.state,
        ordering: original.ordering,
        importance: original.importance,

        effectMeasure: original.effectMeasure,
        relativeEffect: original.relativeEffect,
        relativeEffectLower: original.relativeEffectLower,
        relativeEffectUpper: original.relativeEffectUpper,
        baselineRisk: original.baselineRisk,
        absoluteEffectIntervention: original.absoluteEffectIntervention,
        absoluteEffectComparison: original.absoluteEffectComparison,
        interventionParticipants: original.interventionParticipants,
        comparisonParticipants: original.comparisonParticipants,
        numberOfStudies: original.numberOfStudies,

        continuousUnit: original.continuousUnit,
        continuousScaleLower: original.continuousScaleLower,
        continuousScaleUpper: original.continuousScaleUpper,

        certaintyOverall: original.certaintyOverall,
        riskOfBias: original.riskOfBias,
        inconsistency: original.inconsistency,
        indirectness: original.indirectness,
        imprecision: original.imprecision,
        publicationBias: original.publicationBias,
        largeEffect: original.largeEffect,
        doseResponse: original.doseResponse,
        plausibleConfounding: original.plausibleConfounding,

        gradeFootnotes: original.gradeFootnotes ?? Prisma.JsonNull,
        plainLanguageSummary: original.plainLanguageSummary,
        forestPlotS3Key: original.forestPlotS3Key,

        isShadow: true,
        shadowOfId: outcomeId,
      },
    });
  }

  /**
   * Promote a shadow outcome: copy its evidence fields back to the original,
   * then soft-delete the shadow.  Returns the updated original.
   */
  async promoteShadow(shadowId: string, userId: string) {
    const shadow = await this.prisma.outcome.findUnique({
      where: { id: shadowId },
    });
    if (!shadow) {
      throw new NotFoundException(`Outcome ${shadowId} not found`);
    }
    if (!shadow.isShadow || !shadow.shadowOfId) {
      throw new BadRequestException(`Outcome ${shadowId} is not a shadow outcome`);
    }

    const original = await this.prisma.outcome.findUnique({
      where: { id: shadow.shadowOfId },
    });
    if (!original) {
      throw new NotFoundException(`Original outcome ${shadow.shadowOfId} not found`);
    }

    const [updatedOriginal] = await this.prisma.$transaction([
      this.prisma.outcome.update({
        where: { id: original.id },
        data: {
          title: shadow.title,
          outcomeType: shadow.outcomeType,
          state: shadow.state,
          ordering: shadow.ordering,
          importance: shadow.importance,

          effectMeasure: shadow.effectMeasure,
          relativeEffect: shadow.relativeEffect,
          relativeEffectLower: shadow.relativeEffectLower,
          relativeEffectUpper: shadow.relativeEffectUpper,
          baselineRisk: shadow.baselineRisk,
          absoluteEffectIntervention: shadow.absoluteEffectIntervention,
          absoluteEffectComparison: shadow.absoluteEffectComparison,
          interventionParticipants: shadow.interventionParticipants,
          comparisonParticipants: shadow.comparisonParticipants,
          numberOfStudies: shadow.numberOfStudies,

          continuousUnit: shadow.continuousUnit,
          continuousScaleLower: shadow.continuousScaleLower,
          continuousScaleUpper: shadow.continuousScaleUpper,

          certaintyOverall: shadow.certaintyOverall,
          riskOfBias: shadow.riskOfBias,
          inconsistency: shadow.inconsistency,
          indirectness: shadow.indirectness,
          imprecision: shadow.imprecision,
          publicationBias: shadow.publicationBias,
          largeEffect: shadow.largeEffect,
          doseResponse: shadow.doseResponse,
          plausibleConfounding: shadow.plausibleConfounding,

          gradeFootnotes: shadow.gradeFootnotes ?? Prisma.JsonNull,
          plainLanguageSummary: shadow.plainLanguageSummary,
          forestPlotS3Key: shadow.forestPlotS3Key,
        },
      }),
      this.prisma.outcome.update({
        where: { id: shadowId },
        data: { isDeleted: true },
      }),
    ]);

    return updatedOriginal;
  }

  /**
   * List all non-deleted shadow outcomes that belong to the given original.
   */
  async findShadows(outcomeId: string) {
    return this.prisma.outcome.findMany({
      where: {
        shadowOfId: outcomeId,
        isShadow: true,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
