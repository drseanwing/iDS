import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tag CRUD ──────────────────────────────────────────────────────────────

  async create(guidelineId: string, dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        guidelineId,
        name: dto.name,
        color: dto.color ?? null,
      },
    });
  }

  async findByGuideline(guidelineId: string) {
    return this.prisma.tag.findMany({
      where: { guidelineId },
      orderBy: { name: 'asc' },
    });
  }

  async update(guidelineId: string, tagId: string, dto: UpdateTagDto) {
    await this.findTagOrThrow(guidelineId, tagId);
    return this.prisma.tag.update({
      where: { id: tagId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });
  }

  async remove(guidelineId: string, tagId: string) {
    await this.findTagOrThrow(guidelineId, tagId);
    return this.prisma.tag.delete({ where: { id: tagId } });
  }

  // ── Tag assignment ────────────────────────────────────────────────────────

  async addTagToRecommendation(recommendationId: string, tagId: string) {
    const existing = await this.prisma.recommendationTag.findUnique({
      where: { recommendationId_tagId: { recommendationId, tagId } },
    });
    if (existing) {
      throw new ConflictException(
        `Tag ${tagId} is already assigned to recommendation ${recommendationId}`,
      );
    }
    return this.prisma.recommendationTag.create({
      data: { recommendationId, tagId },
    });
  }

  async removeTagFromRecommendation(recommendationId: string, tagId: string) {
    const existing = await this.prisma.recommendationTag.findUnique({
      where: { recommendationId_tagId: { recommendationId, tagId } },
    });
    if (!existing) {
      throw new NotFoundException(
        `Tag ${tagId} is not assigned to recommendation ${recommendationId}`,
      );
    }
    return this.prisma.recommendationTag.delete({
      where: { recommendationId_tagId: { recommendationId, tagId } },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async findTagOrThrow(guidelineId: string, tagId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.guidelineId !== guidelineId) {
      throw new NotFoundException(
        `Tag ${tagId} not found in guideline ${guidelineId}`,
      );
    }
    return tag;
  }
}
