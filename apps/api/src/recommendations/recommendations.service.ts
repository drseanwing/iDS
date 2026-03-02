import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
        strength: (dto.strength as any) || 'NOT_SET',
        recommendationType: (dto.recommendationType as any) || 'GRADE',
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async findByGuideline(guidelineId: string) {
    return this.prisma.recommendation.findMany({
      where: { guidelineId, isDeleted: false },
      orderBy: { ordering: 'asc' },
    });
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
    return this.prisma.recommendation.update({
      where: { id },
      data: {
        ...(dto as any),
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
}
