import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto, userId: string) {
    return this.prisma.task.create({
      data: {
        guidelineId: dto.guidelineId,
        title: dto.title,
        description: dto.description,
        status: (dto.status as TaskStatus) ?? TaskStatus.TODO,
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        entityType: dto.entityType,
        entityId: dto.entityId,
        createdBy: userId,
      },
      include: { assignee: true },
    });
  }

  async findByGuideline(
    guidelineId: string,
    filters?: { status?: string; assigneeId?: string },
    page = 1,
    limit = 20,
  ) {
    const where: Record<string, unknown> = { guidelineId };
    if (filters?.status) where.status = filters.status as TaskStatus;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { assignee: true },
      }),
      this.prisma.task.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignee: true },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Task ${id} not found`);

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && {
          status: dto.status as TaskStatus,
        }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.entityType !== undefined && { entityType: dto.entityType }),
        ...(dto.entityId !== undefined && { entityId: dto.entityId }),
      },
      include: { assignee: true },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Task ${id} not found`);
    return this.prisma.task.delete({ where: { id } });
  }
}
