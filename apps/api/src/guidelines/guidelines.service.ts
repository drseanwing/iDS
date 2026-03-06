import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EtdMode, Prisma, GuidelineType, PicoDisplay } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateGuidelineDto } from './dto/create-guideline.dto';
import { UpdateGuidelineDto } from './dto/update-guideline.dto';

@Injectable()
export class GuidelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGuidelineDto, userId: string) {
    return this.prisma.guideline.create({
      data: {
        title: dto.title,
        shortName: dto.shortName,
        description: dto.description,
        organizationId: dto.organizationId,
        language: dto.language || 'en',
        guidelineType: (dto.guidelineType as GuidelineType) || GuidelineType.ORGANIZATIONAL,
        fhirMeta: dto.fhirMeta ?? {},
        createdBy: userId,
      },
    });
  }

  async findAll(filters?: { organizationId?: string; isDeleted?: boolean }, page = 1, limit = 20) {
    const where = {
      organizationId: filters?.organizationId,
      isDeleted: filters?.isDeleted ?? false,
    };
    const [data, total] = await Promise.all([
      this.prisma.guideline.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.guideline.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id },
      include: {
        organization: true,
        sections: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
    });
    if (!guideline) {
      throw new NotFoundException(`Guideline ${id} not found`);
    }
    return guideline;
  }

  async update(id: string, dto: UpdateGuidelineDto) {
    await this.findOne(id); // ensure exists
    const data: Prisma.GuidelineUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.shortName !== undefined) data.shortName = dto.shortName;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.language !== undefined) data.language = dto.language;
    if (dto.guidelineType !== undefined) data.guidelineType = dto.guidelineType as GuidelineType;
    if (dto.etdMode !== undefined) data.etdMode = dto.etdMode as EtdMode;
    if (dto.showSectionNumbers !== undefined) data.showSectionNumbers = dto.showSectionNumbers;
    if (dto.showCertaintyInLabel !== undefined) data.showCertaintyInLabel = dto.showCertaintyInLabel;
    if (dto.showGradeDescription !== undefined) data.showGradeDescription = dto.showGradeDescription;
    if (dto.trackChangesDefault !== undefined) data.trackChangesDefault = dto.trackChangesDefault;
    if (dto.enableSubscriptions !== undefined) data.enableSubscriptions = dto.enableSubscriptions;
    if (dto.enablePublicComments !== undefined) data.enablePublicComments = dto.enablePublicComments;
    if (dto.showSectionTextPreview !== undefined) data.showSectionTextPreview = dto.showSectionTextPreview;
    if (dto.pdfColumnLayout !== undefined) data.pdfColumnLayout = dto.pdfColumnLayout;
    if (dto.picoDisplayMode !== undefined) data.picoDisplayMode = dto.picoDisplayMode as PicoDisplay;
    if (dto.coverPageUrl !== undefined) data.coverPageUrl = dto.coverPageUrl;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;
    if (dto.fhirMeta !== undefined) data.fhirMeta = dto.fhirMeta;
    return this.prisma.guideline.update({
      where: { id },
      data,
    });
  }

  async getDashboardStats(organizationId?: string) {
    const guidelineWhere = { isDeleted: false, ...(organizationId ? { organizationId } : {}) };
    const [guidelines, sections, recommendations] = await Promise.all([
      this.prisma.guideline.count({ where: guidelineWhere }),
      this.prisma.section.count({
        where: {
          isDeleted: false,
          guideline: guidelineWhere,
        },
      }),
      this.prisma.recommendation.count({
        where: {
          isDeleted: false,
          guideline: guidelineWhere,
        },
      }),
    ]);
    return { guidelines, sections, recommendations };
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.guideline.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: string) {
    const guideline = await this.prisma.guideline.findUnique({ where: { id } });
    if (!guideline) {
      throw new NotFoundException(`Guideline ${id} not found`);
    }
    return this.prisma.guideline.update({
      where: { id },
      data: { isDeleted: false },
    });
  }

  async updateStatus(id: string, status: string) {
    const guideline = await this.findOne(id);
    const allowed = this.getAllowedTransitions(guideline.status);
    if (!allowed.includes(status as any)) {
      throw new BadRequestException(`Cannot transition from ${guideline.status} to ${status}`);
    }
    return this.prisma.guideline.update({
      where: { id },
      data: { status: status as any },
    });
  }

  private getAllowedTransitions(current: string): string[] {
    const transitions: Record<string, string[]> = {
      DRAFT: ['DRAFT_INTERNAL', 'PUBLIC_CONSULTATION'],
      DRAFT_INTERNAL: ['DRAFT', 'PUBLISHED_INTERNAL', 'PUBLIC_CONSULTATION'],
      PUBLISHED_INTERNAL: ['DRAFT_INTERNAL', 'PUBLIC_CONSULTATION', 'PUBLISHED'],
      PUBLIC_CONSULTATION: ['DRAFT_INTERNAL', 'PUBLISHED_INTERNAL', 'PUBLISHED'],
      PUBLISHED: ['DRAFT'],
    };
    return transitions[current] ?? [];
  }
}
