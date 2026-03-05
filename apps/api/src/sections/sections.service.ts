import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findByGuideline(guidelineId: string, page = 1, limit = 20) {
    const where = { guidelineId, isDeleted: false };
    const [data, total] = await Promise.all([
      this.prisma.section.findMany({
        where,
        orderBy: { ordering: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          children: {
            where: { isDeleted: false },
            orderBy: { ordering: 'asc' },
          },
        },
      }),
      this.prisma.section.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
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
}
