import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

  async findByGuideline(guidelineId: string) {
    return this.prisma.section.findMany({
      where: { guidelineId, isDeleted: false },
      orderBy: { ordering: 'asc' },
      include: {
        children: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
    });
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
    return this.prisma.section.update({
      where: { id },
      data: dto as any,
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
