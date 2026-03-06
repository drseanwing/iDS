import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateCoiDto, UpdateCoiDto } from './dto/create-coi.dto';

@Injectable()
export class CoiService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCoiDto, userId: string) {
    return this.prisma.coiRecord.create({
      data: {
        guidelineId: dto.guidelineId,
        userId,
        publicSummary: dto.publicSummary,
        internalSummary: dto.internalSummary,
        interventionConflicts: dto.interventionConflicts
          ? {
              create: dto.interventionConflicts.map((ic) => ({
                interventionLabel: ic.interventionLabel,
                conflictLevel: (ic.conflictLevel as any) ?? 'NONE',
                internalComment: ic.internalComment,
                excludeFromVoting: ic.excludeFromVoting ?? false,
                isPublic: ic.isPublic ?? true,
              })),
            }
          : undefined,
      },
      include: { interventionConflicts: true, documents: true },
    });
  }

  async findByGuideline(guidelineId: string, page = 1, limit = 20) {
    const where = { guidelineId };
    const [data, total] = await Promise.all([
      this.prisma.coiRecord.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, displayName: true, email: true } },
          interventionConflicts: true,
          documents: true,
        },
      }),
      this.prisma.coiRecord.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findByUser(guidelineId: string, userId: string) {
    const record = await this.prisma.coiRecord.findUnique({
      where: { guidelineId_userId: { guidelineId, userId } },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
        interventionConflicts: true,
        documents: true,
      },
    });
    if (!record) throw new NotFoundException(`COI record not found for user ${userId} in guideline ${guidelineId}`);
    return record;
  }

  async update(id: string, dto: UpdateCoiDto, userId: string) {
    const existing = await this.prisma.coiRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`COI record ${id} not found`);

    return this.prisma.$transaction(async (tx) => {
      // If intervention conflicts are provided, replace them all
      if (dto.interventionConflicts !== undefined) {
        await tx.coiInterventionConflict.deleteMany({ where: { coiRecordId: id } });
        if (dto.interventionConflicts.length > 0) {
          await tx.coiInterventionConflict.createMany({
            data: dto.interventionConflicts.map((ic) => ({
              coiRecordId: id,
              interventionLabel: ic.interventionLabel,
              conflictLevel: (ic.conflictLevel as any) ?? 'NONE',
              internalComment: ic.internalComment,
              excludeFromVoting: ic.excludeFromVoting ?? false,
              isPublic: ic.isPublic ?? true,
            })),
          });
        }
      }

      return tx.coiRecord.update({
        where: { id },
        data: {
          publicSummary: dto.publicSummary,
          internalSummary: dto.internalSummary,
        },
        include: { interventionConflicts: true, documents: true },
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.coiRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`COI record ${id} not found`);

    // Soft-delete: remove intervention conflicts and the record
    // The schema doesn't have an isDeleted flag, so we hard-delete the record
    // and its related data within a transaction.
    return this.prisma.$transaction(async (tx) => {
      await tx.coiInterventionConflict.deleteMany({ where: { coiRecordId: id } });
      await tx.coiDocument.deleteMany({ where: { coiRecordId: id } });
      return tx.coiRecord.delete({ where: { id } });
    });
  }
}
