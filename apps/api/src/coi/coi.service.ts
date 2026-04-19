import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateCoiDto, UpdateCoiDto } from './dto/create-coi.dto';
import { BulkCoiDto } from './dto/bulk-coi.dto';

@Injectable()
export class CoiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

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

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.coiInterventionConflict.deleteMany({ where: { coiRecordId: id } });
      await tx.coiDocument.deleteMany({ where: { coiRecordId: id } });
      return tx.coiRecord.delete({ where: { id } });
    });
  }

  // -----------------------------------------------------------------------
  // PICO event-driven intervention matrix refresh
  // -----------------------------------------------------------------------

  @OnEvent('pico.changed')
  async onPicoChanged(payload: { guidelineId: string }): Promise<void> {
    await this.refreshInterventionMatrix(payload.guidelineId);
  }

  async refreshInterventionMatrix(guidelineId: string): Promise<void> {
    // 1. Fetch all active PICOs for the guideline
    const picos = await this.prisma.pico.findMany({
      where: { guidelineId, isDeleted: false },
      select: { intervention: true, comparator: true },
    });

    // 2. Extract unique intervention labels (from intervention + comparator fields)
    const interventionLabels = [
      ...new Set([
        ...picos.map((p: { intervention: string; comparator: string }) => p.intervention).filter(Boolean),
        ...picos.map((p: { intervention: string; comparator: string }) => p.comparator).filter(Boolean),
      ]),
    ];

    // 3. Get all COI records for the guideline
    const coiRecords = await this.prisma.coiRecord.findMany({
      where: { guidelineId },
      select: { id: true },
    });

    // 4. Get existing conflicts to preserve data
    const existing = await this.prisma.coiInterventionConflict.findMany({
      where: { coiRecord: { guidelineId } },
      select: { coiRecordId: true, interventionLabel: true },
    });
    const existingKeys = new Set(
      existing.map((e: { coiRecordId: string; interventionLabel: string }) => `${e.coiRecordId}:${e.interventionLabel}`),
    );

    // 5. Create missing conflict records (don't update existing ones)
    const toCreate: Array<{
      coiRecordId: string;
      interventionLabel: string;
      conflictLevel: string;
      excludeFromVoting: boolean;
      isPublic: boolean;
    }> = [];

    for (const record of coiRecords) {
      for (const label of interventionLabels) {
        if (!existingKeys.has(`${record.id}:${label}`)) {
          toCreate.push({
            coiRecordId: record.id,
            interventionLabel: label,
            conflictLevel: 'NONE',
            excludeFromVoting: false,
            isPublic: true,
          });
        }
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.coiInterventionConflict.createMany({
        data: toCreate as any,
        skipDuplicates: true,
      });
    }
  }

  // -----------------------------------------------------------------------
  // COI Document Upload
  // -----------------------------------------------------------------------

  async uploadDocument(
    coiRecordId: string,
    file: Express.Multer.File,
  ): Promise<{ key: string; url: string; document: any }> {
    const record = await this.prisma.coiRecord.findUnique({ where: { id: coiRecordId } });
    if (!record) throw new NotFoundException('CoiRecord not found');

    const key = `coi-documents/${record.guidelineId}/${coiRecordId}/${Date.now()}-${file.originalname}`;
    await this.storageService.upload(key, file.buffer, file.mimetype);

    // Store document reference in CoiDocument table
    const document = await this.prisma.coiDocument.create({
      data: {
        coiRecordId,
        fileName: file.originalname,
        s3Key: key,
        mimeType: file.mimetype,
      },
    });

    return {
      key,
      url: `/api/v1/coi-records/${coiRecordId}/documents/${encodeURIComponent(key)}`,
      document,
    };
  }

  async getDocuments(coiRecordId: string): Promise<any[]> {
    const record = await this.prisma.coiRecord.findUnique({ where: { id: coiRecordId } });
    if (!record) throw new NotFoundException('CoiRecord not found');

    return this.prisma.coiDocument.findMany({
      where: { coiRecordId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  // -----------------------------------------------------------------------
  // Bulk Conflict Operations
  // -----------------------------------------------------------------------

  async bulkSetConflictLevel(guidelineId: string, dto: BulkCoiDto): Promise<number> {
    const where =
      dto.mode === 'per-intervention'
        ? { interventionLabel: dto.interventionLabel, coiRecord: { guidelineId } }
        : { coiRecordId: dto.coiRecordId };

    const result = await this.prisma.coiInterventionConflict.updateMany({
      where,
      data: { conflictLevel: dto.conflictLevel as any },
    });

    return result.count;
  }
}
