import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RecommendationStrength, RecommendationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';

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

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.recommendation.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
