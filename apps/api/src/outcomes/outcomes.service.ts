import { Injectable, NotFoundException } from '@nestjs/common';
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
}
