import { Injectable, NotFoundException } from '@nestjs/common';
import { EtdFactorType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEtdFactorDto } from './dto/update-etd-factor.dto';
import { UpdateEtdJudgmentDto } from './dto/update-etd-judgment.dto';
import { CreateEtdJudgmentDto } from './dto/create-etd-judgment.dto';

// All factor types ordered by mode membership
const ALL_FACTOR_TYPES: EtdFactorType[] = [
  // 4-factor (original GRADE)
  EtdFactorType.BENEFITS_HARMS,
  EtdFactorType.QUALITY_OF_EVIDENCE,
  EtdFactorType.PREFERENCES_VALUES,
  EtdFactorType.RESOURCES_OTHER,
  // 7-factor additions
  EtdFactorType.EQUITY,
  EtdFactorType.ACCEPTABILITY,
  EtdFactorType.FEASIBILITY,
  // 12-factor expansions
  EtdFactorType.DESIRABLE_EFFECTS,
  EtdFactorType.UNDESIRABLE_EFFECTS,
  EtdFactorType.BALANCE,
  EtdFactorType.RESOURCES_REQUIRED,
  EtdFactorType.CERTAINTY_OF_RESOURCES,
  EtdFactorType.COST_EFFECTIVENESS,
];

@Injectable()
export class EtdService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or initialize EtD factors for a recommendation.
   * Creates missing factor rows so each factorType has exactly one EtdFactor record.
   * All factor types are always created (mode filtering is a UI concern preserving data on mode switches).
   */
  async getOrInit(recommendationId: string) {
    // Verify recommendation exists
    const rec = await this.prisma.recommendation.findUnique({
      where: { id: recommendationId },
    });
    if (!rec) {
      throw new NotFoundException(`Recommendation ${recommendationId} not found`);
    }

    // Load existing factors
    const existing = await this.prisma.etdFactor.findMany({
      where: { recommendationId },
      include: { judgments: true },
      orderBy: { ordering: 'asc' },
    });

    const existingTypes = new Set(existing.map((f) => f.factorType));
    const missing = ALL_FACTOR_TYPES.filter((t) => !existingTypes.has(t));

    if (missing.length > 0) {
      await this.prisma.etdFactor.createMany({
        data: missing.map((factorType) => ({
          recommendationId,
          factorType,
          ordering: ALL_FACTOR_TYPES.indexOf(factorType),
        })),
      });

      return this.prisma.etdFactor.findMany({
        where: { recommendationId },
        include: { judgments: true },
        orderBy: { ordering: 'asc' },
      });
    }

    return existing;
  }

  async updateFactor(id: string, dto: UpdateEtdFactorDto) {
    const factor = await this.prisma.etdFactor.findUnique({ where: { id } });
    if (!factor) {
      throw new NotFoundException(`EtdFactor ${id} not found`);
    }

    const data: Record<string, unknown> = {};
    if (dto.summaryText !== undefined) data.summaryText = dto.summaryText;
    if (dto.researchEvidence !== undefined) data.researchEvidence = dto.researchEvidence;
    if (dto.additionalConsiderations !== undefined) data.additionalConsiderations = dto.additionalConsiderations;
    if (dto.summaryPublic !== undefined) data.summaryPublic = dto.summaryPublic;
    if (dto.evidencePublic !== undefined) data.evidencePublic = dto.evidencePublic;
    if (dto.considerationsPublic !== undefined) data.considerationsPublic = dto.considerationsPublic;

    return this.prisma.etdFactor.update({
      where: { id },
      data,
      include: { judgments: true },
    });
  }

  async addJudgment(factorId: string, dto: CreateEtdJudgmentDto) {
    const factor = await this.prisma.etdFactor.findUnique({ where: { id: factorId } });
    if (!factor) {
      throw new NotFoundException(`EtdFactor ${factorId} not found`);
    }

    return this.prisma.etdJudgment.create({
      data: {
        etdFactorId: factorId,
        interventionLabel: dto.interventionLabel,
      },
    });
  }

  async updateJudgment(id: string, dto: UpdateEtdJudgmentDto) {
    const judgment = await this.prisma.etdJudgment.findUnique({ where: { id } });
    if (!judgment) {
      throw new NotFoundException(`EtdJudgment ${id} not found`);
    }

    const data: Record<string, unknown> = {};
    if (dto.judgment !== undefined) data.judgment = dto.judgment;
    if (dto.colorCode !== undefined) data.colorCode = dto.colorCode;

    return this.prisma.etdJudgment.update({ where: { id }, data });
  }

  async deleteJudgment(id: string) {
    const judgment = await this.prisma.etdJudgment.findUnique({ where: { id } });
    if (!judgment) {
      throw new NotFoundException(`EtdJudgment ${id} not found`);
    }
    return this.prisma.etdJudgment.delete({ where: { id } });
  }
}
