import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EtdMode, Prisma, GuidelineType, GuidelineRole, PicoDisplay } from '@prisma/client';
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
        fhirMeta: (dto.fhirMeta ?? {}) as Prisma.InputJsonValue,
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

  async findBySlug(shortName: string) {
    const guideline = await this.prisma.guideline.findFirst({
      where: {
        shortName: { equals: shortName, mode: 'insensitive' },
        isDeleted: false,
      },
      include: {
        organization: true,
        sections: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
    });
    if (!guideline) {
      throw new NotFoundException(`Guideline with slug '${shortName}' not found`);
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
    if (dto.fhirMeta !== undefined) data.fhirMeta = dto.fhirMeta as Prisma.InputJsonValue;
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

  // ── Permission management ──────────────────────────────────

  async addPermission(guidelineId: string, userId: string, role: string) {
    await this.findOne(guidelineId);
    return this.prisma.guidelinePermission.upsert({
      where: {
        guidelineId_userId: { guidelineId, userId },
      },
      update: { role: role as GuidelineRole },
      create: {
        guidelineId,
        userId,
        role: role as GuidelineRole,
      },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  async removePermission(guidelineId: string, userId: string) {
    await this.findOne(guidelineId);
    const existing = await this.prisma.guidelinePermission.findUnique({
      where: {
        guidelineId_userId: { guidelineId, userId },
      },
    });
    if (!existing) {
      throw new NotFoundException(
        `Permission for user ${userId} on guideline ${guidelineId} not found`,
      );
    }
    return this.prisma.guidelinePermission.delete({
      where: {
        guidelineId_userId: { guidelineId, userId },
      },
    });
  }

  async findPermissions(guidelineId: string) {
    await this.findOne(guidelineId);
    return this.prisma.guidelinePermission.findMany({
      where: { guidelineId },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { role: 'asc' },
    });
  }

  async findUserPermission(guidelineId: string, userId: string) {
    await this.findOne(guidelineId);
    const permission = await this.prisma.guidelinePermission.findUnique({
      where: {
        guidelineId_userId: { guidelineId, userId },
      },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });
    if (!permission) {
      throw new NotFoundException(
        `Permission for user ${userId} on guideline ${guidelineId} not found`,
      );
    }
    return permission;
  }

  async exportJson(id: string) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        sections: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
          include: {
            children: {
              where: { isDeleted: false },
              orderBy: { ordering: 'asc' },
              include: {
                children: {
                  where: { isDeleted: false },
                  orderBy: { ordering: 'asc' },
                },
                sectionReferences: { orderBy: { ordering: 'asc' } },
                sectionPicos: { orderBy: { ordering: 'asc' } },
                sectionRecommendations: { orderBy: { ordering: 'asc' } },
              },
            },
            sectionReferences: { orderBy: { ordering: 'asc' } },
            sectionPicos: { orderBy: { ordering: 'asc' } },
            sectionRecommendations: { orderBy: { ordering: 'asc' } },
          },
        },
        recommendations: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
          include: {
            etdFactors: {
              orderBy: { ordering: 'asc' },
              include: {
                judgments: true,
              },
            },
            sectionPlacements: { orderBy: { ordering: 'asc' } },
            picoLinks: true,
            tags: true,
          },
        },
        picos: {
          where: { isDeleted: false },
          include: {
            outcomes: {
              where: { isDeleted: false },
              orderBy: { ordering: 'asc' },
              include: {
                referenceLinks: true,
              },
            },
            codes: true,
            practicalIssues: { orderBy: { ordering: 'asc' } },
          },
        },
        references: {
          where: { isDeleted: false },
          include: {
            sectionPlacements: { orderBy: { ordering: 'asc' } },
            outcomeLinks: true,
          },
        },
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
        versions: {
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            versionType: true,
            comment: true,
            isPublic: true,
            publishedAt: true,
            publishedBy: true,
          },
        },
      },
    });

    if (!guideline || guideline.isDeleted) {
      throw new NotFoundException(`Guideline ${id} not found`);
    }

    const g = guideline as any;
    const {
      isDeleted,
      organization,
      sections,
      recommendations,
      picos,
      references,
      permissions,
      versions,
      ...guidelineFields
    } = g;

    return {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      guideline: guidelineFields,
      organization: organization ?? null,
      sections: sections.map((s: any) => this.stripSectionInternal(s)),
      recommendations: recommendations.map((r: any) => {
        const { guidelineId, createdAt, updatedAt, isDeleted, ...rest } = r;
        return rest;
      }),
      picos: picos.map((p: any) => {
        const { guidelineId, createdAt, updatedAt, isDeleted, ...rest } = p;
        return {
          ...rest,
          outcomes: (p.outcomes ?? []).map((o: any) => {
            const { createdAt, updatedAt, isDeleted, ...oRest } = o;
            return oRest;
          }),
        };
      }),
      references: references.map((ref: any) => {
        const { guidelineId, createdAt, updatedAt, isDeleted, ...rest } = ref;
        return rest;
      }),
      permissions: permissions.map((perm: any) => {
        const { guidelineId, ...rest } = perm;
        return rest;
      }),
      versions,
    };
  }

  private stripSectionInternal(section: any): any {
    const { guidelineId, createdAt, updatedAt, isDeleted, ...rest } = section;
    if (rest.children && Array.isArray(rest.children)) {
      rest.children = rest.children.map((c: any) => this.stripSectionInternal(c));
    }
    return rest;
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
