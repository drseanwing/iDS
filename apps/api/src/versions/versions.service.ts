import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { VersionType, GuidelineStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateVersionDto } from './dto/create-version.dto';

@Injectable()
export class VersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async publish(dto: CreateVersionDto, userId: string) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id: dto.guidelineId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            logoUrl: true,
            customColors: true,
            strengthLabels: true,
          },
        },
        sections: {
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
            emrElements: true,
            tags: true,
          },
        },
        references: {
          where: { isDeleted: false },
          include: {
            sectionPlacements: { orderBy: { ordering: 'asc' } },
            outcomeLinks: true,
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
            sectionPlacements: { orderBy: { ordering: 'asc' } },
            recommendationLinks: true,
          },
        },
      },
    });
    if (!guideline) throw new NotFoundException(`Guideline ${dto.guidelineId} not found`);
    if (guideline.isDeleted) throw new BadRequestException('Cannot publish a deleted guideline');

    // Duplicate-publish prevention: reject if same versionType was published in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentDuplicate = await this.prisma.guidelineVersion.findFirst({
      where: {
        guidelineId: dto.guidelineId,
        versionType: dto.versionType as VersionType,
        publishedAt: { gte: oneMinuteAgo },
      },
      orderBy: { publishedAt: 'desc' },
    });
    if (recentDuplicate) {
      // Idempotent: return the already-published version rather than creating a duplicate
      return { ...recentDuplicate, deduplicated: true };
    }

    // Compute next version number
    const lastVersion = await this.prisma.guidelineVersion.findFirst({
      where: { guidelineId: dto.guidelineId },
      orderBy: { publishedAt: 'desc' },
    });
    const versionNumber = this.computeNextVersion(lastVersion?.versionNumber, dto.versionType as VersionType);

    // Build comprehensive immutable snapshot
    const snapshotBundle = this.buildSnapshotBundle(guideline);

    // Upload JSON snapshot to object storage with one retry on transient errors
    let jsonS3Key: string | null = null;
    const s3Key = `versions/${dto.guidelineId}/${versionNumber}/snapshot.json`;
    try {
      await this.storage.upload(s3Key, JSON.stringify(snapshotBundle), 'application/json');
      jsonS3Key = s3Key;
    } catch {
      // Retry once on transient S3 error
      try {
        await this.storage.upload(s3Key, JSON.stringify(snapshotBundle), 'application/json');
        jsonS3Key = s3Key;
      } catch {
        // Non-fatal: snapshot is still stored in the snapshotBundle DB column
      }
    }

    // Wrap DB writes in a transaction for atomicity
    const version = await this.prisma.$transaction(async (tx) => {
      const newVersion = await tx.guidelineVersion.create({
        data: {
          guidelineId: dto.guidelineId,
          versionNumber,
          versionType: dto.versionType as VersionType,
          comment: dto.comment,
          isPublic: dto.isPublic ?? false,
          publishedBy: userId,
          snapshotBundle,
          ...(jsonS3Key ? { jsonS3Key } : {}),
        },
      });

      // Mark all prior public versions as no longer the latest (superseded)
      if (dto.versionType === 'MAJOR') {
        await tx.guidelineVersion.updateMany({
          where: {
            guidelineId: dto.guidelineId,
            id: { not: newVersion.id },
            isPublic: true,
          },
          data: { isPublic: false },
        });
      }

      // Auto-create next draft: reset guideline to DRAFT so editing can continue.
      // The published content is preserved in the immutable snapshotBundle.
      await tx.guideline.update({
        where: { id: dto.guidelineId },
        data: { status: GuidelineStatus.DRAFT },
      });

      return newVersion;
    });

    return version;
  }

  async compare(versionId1: string, versionId2: string) {
    const [v1, v2] = await Promise.all([
      this.prisma.guidelineVersion.findUnique({ where: { id: versionId1 } }),
      this.prisma.guidelineVersion.findUnique({ where: { id: versionId2 } }),
    ]);
    if (!v1) throw new NotFoundException(`Version ${versionId1} not found`);
    if (!v2) throw new NotFoundException(`Version ${versionId2} not found`);

    return {
      v1: {
        id: v1.id,
        versionNumber: v1.versionNumber,
        versionType: v1.versionType,
        publishedAt: v1.publishedAt,
        comment: v1.comment,
        snapshotBundle: v1.snapshotBundle,
      },
      v2: {
        id: v2.id,
        versionNumber: v2.versionNumber,
        versionType: v2.versionType,
        publishedAt: v2.publishedAt,
        comment: v2.comment,
        snapshotBundle: v2.snapshotBundle,
      },
    };
  }

  async findByGuideline(guidelineId: string, page = 1, limit = 20) {
    const where = { guidelineId };
    const [data, total] = await Promise.all([
      this.prisma.guidelineVersion.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          guidelineId: true,
          versionNumber: true,
          versionType: true,
          comment: true,
          isPublic: true,
          publishedAt: true,
          publishedBy: true,
          pdfS3Key: true,
          jsonS3Key: true,
        },
      }),
      this.prisma.guidelineVersion.count({ where }),
    ]);

    const publisherIds = [...new Set(data.map((v) => v.publishedBy))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: publisherIds } },
      select: { id: true, displayName: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = data.map((v) => {
      const user = userMap.get(v.publishedBy);
      const publisherName = user?.displayName || user?.email || 'Unknown';
      return { ...v, publisherName };
    });

    return new PaginatedResponseDto(enriched, total, page, limit);
  }

  async findLatestPublicVersion(guidelineId: string) {
    const version = await this.prisma.guidelineVersion.findFirst({
      where: { guidelineId, isPublic: true },
      orderBy: { publishedAt: 'desc' },
    });
    if (!version) {
      throw new NotFoundException('No public version available');
    }
    return version.snapshotBundle;
  }

  async findOne(id: string) {
    const version = await this.prisma.guidelineVersion.findUnique({ where: { id } });
    if (!version) throw new NotFoundException(`Version ${id} not found`);

    const user = await this.prisma.user.findUnique({
      where: { id: version.publishedBy },
      select: { displayName: true, email: true },
    });
    const publisherName = user?.displayName || user?.email || 'Unknown';

    return { ...version, publisherName };
  }

  /**
   * Return the JSON snapshot for a version as a Buffer.
   * Attempts to retrieve from object storage first (using jsonS3Key) and falls
   * back to the snapshotBundle stored in the database.
   */
  async getSnapshotBuffer(id: string): Promise<{ buffer: Buffer; versionNumber: string; guidelineId: string }> {
    const version = await this.prisma.guidelineVersion.findUnique({ where: { id } });
    if (!version) throw new NotFoundException(`Version ${id} not found`);

    let buffer: Buffer;
    if (version.jsonS3Key) {
      try {
        buffer = await this.storage.download(version.jsonS3Key);
      } catch {
        // Fall back to DB snapshot if S3 retrieval fails
        buffer = Buffer.from(JSON.stringify(version.snapshotBundle));
      }
    } else {
      buffer = Buffer.from(JSON.stringify(version.snapshotBundle));
    }

    return { buffer, versionNumber: version.versionNumber, guidelineId: version.guidelineId };
  }

  private buildSnapshotBundle(guideline: any) {
    const {
      id,
      createdAt,
      updatedAt,
      isDeleted,
      organization,
      sections,
      recommendations,
      references,
      picos,
      ...guidelineMetadata
    } = guideline;

    return {
      resourceType: 'Bundle',
      type: 'document',
      timestamp: new Date().toISOString(),
      guidelineId: id,
      guideline: guidelineMetadata,
      organization: organization ?? null,
      sections: sections.map((s: any) => {
        const { guidelineId, createdAt, updatedAt, isDeleted, guideline: _g, ...sectionData } = s;
        return sectionData;
      }),
      recommendations: recommendations.map((r: any) => {
        const { guidelineId, createdAt, updatedAt, isDeleted, guideline: _g, ...recData } = r;
        return recData;
      }),
      picos: picos.map((p: any) => {
        const { guidelineId, createdAt, updatedAt, isDeleted, guideline: _g, ...picoData } = p;
        return {
          ...picoData,
          outcomes: (p.outcomes ?? []).map((o: any) => {
            const { createdAt, updatedAt, isDeleted, pico: _p, ...outcomeData } = o;
            return outcomeData;
          }),
        };
      }),
      references: references.map((ref: any) => {
        const { guidelineId, createdAt, updatedAt, isDeleted, guideline: _g, ...refData } = ref;
        return refData;
      }),
    };
  }

  private computeNextVersion(last: string | undefined | null, type: VersionType): string {
    if (!last) return type === VersionType.MAJOR ? '1.0' : '0.1';
    const parts = last.split('.');
    const major = parseInt(parts[0], 10) || 0;
    const minor = parseInt(parts[1], 10) || 0;
    return type === VersionType.MAJOR ? `${major + 1}.0` : `${major}.${minor + 1}`;
  }
}
