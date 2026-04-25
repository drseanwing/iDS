import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSectionDto) {
    if (dto.parentId) {
      const depth = await this.getDepth(dto.parentId);
      if (depth >= 3) {
        throw new UnprocessableEntityException('Section nesting cannot exceed 3 levels');
      }
    }
    return this.prisma.section.create({
      data: {
        guidelineId: dto.guidelineId,
        title: dto.title,
        parentId: dto.parentId,
        text: dto.text,
        ordering: dto.ordering ?? 0,
        excludeFromNumbering: dto.excludeFromNumbering ?? false,
      },
    });
  }

  async findByGuideline(guidelineId: string, page = 1, limit = 20, onlyDeleted = false) {
    // Fetch sections for this guideline to build full tree in memory
    const allSections = await this.prisma.section.findMany({
      where: { guidelineId, isDeleted: onlyDeleted ? true : false },
      orderBy: { ordering: 'asc' },
    });

    // Build a map and assemble tree
    const byId = new Map(allSections.map((s) => [s.id, { ...s, children: [] as any[] }]));
    const roots: any[] = [];

    for (const section of allSections) {
      const node = byId.get(section.id)!;
      if (section.parentId && byId.has(section.parentId)) {
        byId.get(section.parentId)!.children.push(node);
      } else if (!section.parentId) {
        roots.push(node);
      }
    }

    // Paginate root-level sections
    const total = roots.length;
    const paginatedRoots = roots.slice((page - 1) * limit, (page - 1) * limit + limit);

    return new PaginatedResponseDto(paginatedRoots, total, page, limit);
  }

  async findOne(id: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        children: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
        },
        sectionReferences: true,
        sectionPicos: true,
        sectionRecommendations: true,
      },
    });
    if (!section) {
      throw new NotFoundException(`Section ${id} not found`);
    }
    return section;
  }

  async update(id: string, dto: UpdateSectionDto) {
    await this.findOne(id);
    const data: Prisma.SectionUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.text !== undefined) data.text = dto.text;
    if (dto.ordering !== undefined) data.ordering = dto.ordering;
    if (dto.excludeFromNumbering !== undefined) data.excludeFromNumbering = dto.excludeFromNumbering;
    if (dto.parentId !== undefined) data.parent = { connect: { id: dto.parentId } };
    return this.prisma.section.update({
      where: { id },
      data,
    });
  }

  async reorder(dto: ReorderSectionsDto) {
    const updates = dto.sections.map((s) =>
      this.prisma.section.update({
        where: { id: s.id },
        data: { ordering: s.ordering },
      }),
    );
    return this.prisma.$transaction(updates);
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.section.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: string) {
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section) {
      throw new NotFoundException(`Section ${id} not found`);
    }
    return this.prisma.section.update({
      where: { id },
      data: { isDeleted: false },
    });
  }

  private async getDepth(sectionId: string): Promise<number> {
    let depth = 1;
    let currentId: string | null = sectionId;
    while (currentId) {
      const section = await this.prisma.section.findUnique({ where: { id: currentId }, select: { parentId: true } });
      if (!section) break;
      currentId = section.parentId;
      if (currentId) depth++;
    }
    return depth;
  }
}
