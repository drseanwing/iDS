import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CreateChecklistItemDto,
} from './dto/create-milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Milestones ──────────────────────────────────────────────

  async create(dto: CreateMilestoneDto, userId: string) {
    return this.prisma.milestone.create({
      data: {
        guidelineId: dto.guidelineId,
        title: dto.title,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        responsiblePerson: dto.responsiblePerson,
        ordering: dto.ordering ?? 0,
      },
    });
  }

  async findByGuideline(guidelineId: string) {
    const milestones = await this.prisma.milestone.findMany({
      where: { guidelineId },
      orderBy: { ordering: 'asc' },
    });

    const checklistItems = await this.prisma.checklistItem.findMany({
      where: { guidelineId },
      orderBy: { ordering: 'asc' },
    });

    return { milestones, checklistItems };
  }

  async update(id: string, dto: UpdateMilestoneDto) {
    const existing = await this.prisma.milestone.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Milestone ${id} not found`);

    return this.prisma.milestone.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.targetDate !== undefined && {
          targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        }),
        ...(dto.responsiblePerson !== undefined && {
          responsiblePerson: dto.responsiblePerson,
        }),
        ...(dto.ordering !== undefined && { ordering: dto.ordering }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.milestone.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Milestone ${id} not found`);
    return this.prisma.milestone.delete({ where: { id } });
  }

  // ── Checklist Items ─────────────────────────────────────────

  async addChecklistItem(dto: CreateChecklistItemDto) {
    return this.prisma.checklistItem.create({
      data: {
        guidelineId: dto.guidelineId,
        category: dto.category,
        label: dto.label,
        ordering: dto.ordering ?? 0,
      },
    });
  }

  async toggleChecklistItem(
    itemId: string,
    isChecked: boolean,
    userId: string,
  ) {
    const existing = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
    });
    if (!existing)
      throw new NotFoundException(`ChecklistItem ${itemId} not found`);

    return this.prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        isChecked,
        checkedBy: isChecked ? userId : null,
        checkedAt: isChecked ? new Date() : null,
      },
    });
  }

  async removeChecklistItem(itemId: string) {
    const existing = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
    });
    if (!existing)
      throw new NotFoundException(`ChecklistItem ${itemId} not found`);
    return this.prisma.checklistItem.delete({ where: { id: itemId } });
  }
}
