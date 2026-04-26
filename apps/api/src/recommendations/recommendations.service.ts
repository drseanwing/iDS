import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RecommendationStrength, RecommendationType, RecStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';
import { UpdateRecommendationStatusDto } from './dto/update-recommendation-status.dto';
import { CreateEmrElementDto } from './dto/create-emr-element.dto';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRecommendationDto, userId: string) {
    return this.prisma.recommendation.create({
      data: {
        guidelineId: dto.guidelineId,
        title: dto.title,
        description: dto.description,
        strength: (dto.strength as RecommendationStrength) || RecommendationStrength.NOT_SET,
        recommendationType: (dto.recommendationType as RecommendationType) || RecommendationType.GRADE,
        fhirMeta: (dto.fhirMeta ?? {}) as Prisma.InputJsonValue,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async findByGuideline(guidelineId: string, page = 1, limit = 20) {
    const where = { guidelineId, isDeleted: false };
    const [recs, total] = await Promise.all([
      this.prisma.recommendation.findMany({
        where,
        orderBy: { ordering: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sectionPlacements: {
            orderBy: { ordering: 'asc' },
            take: 1,
          },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.recommendation.count({ where }),
    ]);
    // Flatten the primary section placement to a top-level sectionId field for
    // frontend convenience (recommendations are linked to sections via a join table).
    const data = (recs as Array<Record<string, unknown> & { sectionPlacements: Array<{ sectionId: string }> }>)
      .map(({ sectionPlacements, ...rest }) => ({
        ...rest,
        sectionId: sectionPlacements[0]?.sectionId ?? null,
      }));
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string) {
    const rec = await this.prisma.recommendation.findUnique({
      where: { id },
      include: {
        picoLinks: true,
        etdFactors: { include: { judgments: true } },
        sectionPlacements: true,
        tags: { include: { tag: true } },
      },
    });
    if (!rec) {
      throw new NotFoundException(`Recommendation ${id} not found`);
    }
    return rec;
  }

  async update(id: string, dto: UpdateRecommendationDto, userId: string) {
    await this.findOne(id);
    const data: Prisma.RecommendationUpdateInput = { updatedBy: userId };
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.remark !== undefined) data.remark = dto.remark;
    if (dto.rationale !== undefined) data.rationale = dto.rationale;
    if (dto.practicalInfo !== undefined) data.practicalInfo = dto.practicalInfo;
    if (dto.strength !== undefined) data.strength = dto.strength as RecommendationStrength;
    if (dto.recommendationType !== undefined) data.recommendationType = dto.recommendationType as RecommendationType;
    if (dto.fhirMeta !== undefined) data.fhirMeta = dto.fhirMeta as Prisma.InputJsonValue;
    return this.prisma.recommendation.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, dto: UpdateRecommendationStatusDto, userId: string) {
    const rec = await this.prisma.recommendation.findUnique({ where: { id } });
    if (!rec || rec.isDeleted) {
      throw new NotFoundException(`Recommendation ${id} not found`);
    }
    return this.prisma.recommendation.update({
      where: { id },
      data: {
        recStatus: dto.status as RecStatus,
        recStatusDate: new Date(),
        recStatusComment: dto.comment ?? null,
        updatedBy: userId,
      },
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.recommendation.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Aggregate all PICO / outcome data linked to a recommendation so the
   * frontend can render a patient-friendly decision aid (overview layer,
   * benefits-and-harms table, pictograph, full-evidence layer).
   */
  async getDecisionAid(id: string) {
    const rec = await this.prisma.recommendation.findUnique({
      where: { id },
      include: {
        picoLinks: {
          include: {
            pico: {
              include: {
                outcomes: {
                  where: { isDeleted: false, isShadow: false },
                  orderBy: { ordering: 'asc' },
                },
                practicalIssues: { orderBy: { ordering: 'asc' } },
              },
            },
          },
        },
      },
    });
    if (!rec || rec.isDeleted) {
      throw new NotFoundException(`Recommendation ${id} not found`);
    }

    const picos = rec.picoLinks.map((link) => link.pico);

    return {
      recommendation: {
        id: rec.id,
        title: rec.title,
        description: rec.description,
        strength: rec.strength,
        recommendationType: rec.recommendationType,
        remark: rec.remark,
        rationale: rec.rationale,
        practicalInfo: rec.practicalInfo,
        certaintyOfEvidence: rec.certaintyOfEvidence,
      },
      picos,
    };
  }

  // ── EMR Elements ──────────────────────────────────────────────────────────

  async addEmrElement(recommendationId: string, dto: CreateEmrElementDto) {
    const rec = await this.prisma.recommendation.findUnique({ where: { id: recommendationId } });
    if (!rec || rec.isDeleted) {
      throw new NotFoundException(`Recommendation ${recommendationId} not found`);
    }
    return this.prisma.emrElement.create({
      data: {
        recommendationId,
        elementType: dto.elementType as any,
        codeSystem: dto.codeSystem as any,
        code: dto.code,
        display: dto.display,
        implementationDescription: dto.implementationDescription ?? null,
      },
    });
  }

  async removeEmrElement(recommendationId: string, elementId: string) {
    const existing = await this.prisma.emrElement.findUnique({ where: { id: elementId } });
    if (!existing || existing.recommendationId !== recommendationId) {
      throw new NotFoundException(`EmrElement ${elementId} not found on Recommendation ${recommendationId}`);
    }
    return this.prisma.emrElement.delete({ where: { id: elementId } });
  }

  async findEmrElements(recommendationId: string) {
    const rec = await this.prisma.recommendation.findUnique({ where: { id: recommendationId } });
    if (!rec || rec.isDeleted) {
      throw new NotFoundException(`Recommendation ${recommendationId} not found`);
    }
    return this.prisma.emrElement.findMany({ where: { recommendationId } });
  }
}
