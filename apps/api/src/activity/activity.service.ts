import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';

export interface LogEntryInput {
  guidelineId: string;
  userId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  entityTitle?: string;
  changeDetails?: any;
  comment?: string;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: LogEntryInput) {
    return this.prisma.activityLogEntry.create({ data: input });
  }

  async findByGuideline(
    guidelineId: string,
    filters?: { userId?: string; entityType?: string; actionType?: string },
    page = 1,
    limit = 50,
  ) {
    const where: any = { guidelineId };
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.actionType) where.actionType = filters.actionType;
    const [data, total] = await Promise.all([
      this.prisma.activityLogEntry.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, displayName: true, email: true } } },
      }),
      this.prisma.activityLogEntry.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }
}
