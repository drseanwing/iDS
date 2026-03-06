import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { VersionType, GuidelineStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateVersionDto } from './dto/create-version.dto';

@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(dto: CreateVersionDto, userId: string) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id: dto.guidelineId },
      include: {
        sections: { where: { isDeleted: false }, orderBy: { ordering: 'asc' } },
        recommendations: { where: { isDeleted: false } },
        references: { where: { isDeleted: false } },
        picos: { where: { isDeleted: false }, include: { outcomes: { where: { isDeleted: false } } } },
      },
    });
    if (!guideline) throw new NotFoundException(`Guideline ${dto.guidelineId} not found`);
    if (guideline.isDeleted) throw new BadRequestException('Cannot publish a deleted guideline');

    // Compute next version number
    const lastVersion = await this.prisma.guidelineVersion.findFirst({
      where: { guidelineId: dto.guidelineId },
      orderBy: { publishedAt: 'desc' },
    });
    const versionNumber = this.computeNextVersion(lastVersion?.versionNumber, dto.versionType as VersionType);

    // Create immutable snapshot
    const { id: _id, createdAt: _ca, updatedAt: _ua, isDeleted: _del, ...guidelineSnapshot } = guideline as any;
    const snapshotBundle = {
      resourceType: 'Bundle',
      type: 'document',
      timestamp: new Date().toISOString(),
      guideline: guidelineSnapshot,
    };

    const version = await this.prisma.guidelineVersion.create({
      data: {
        guidelineId: dto.guidelineId,
        versionNumber,
        versionType: dto.versionType as VersionType,
        comment: dto.comment,
        isPublic: dto.isPublic ?? false,
        publishedBy: userId,
        snapshotBundle,
      },
    });

    // Update guideline status to PUBLISHED if it was a major version
    if (dto.versionType === 'MAJOR') {
      await this.prisma.guideline.update({
        where: { id: dto.guidelineId },
        data: { status: GuidelineStatus.PUBLISHED },
      });
    }

    return version;
  }

  async findByGuideline(guidelineId: string, page = 1, limit = 20) {
    const where = { guidelineId };
    const [data, total] = await Promise.all([
      this.prisma.guidelineVersion.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.guidelineVersion.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string) {
    const version = await this.prisma.guidelineVersion.findUnique({ where: { id } });
    if (!version) throw new NotFoundException(`Version ${id} not found`);
    return version;
  }

  private computeNextVersion(last: string | undefined | null, type: VersionType): string {
    if (!last) return type === VersionType.MAJOR ? '1.0' : '0.1';
    const parts = last.split('.');
    const major = parseInt(parts[0], 10) || 0;
    const minor = parseInt(parts[1], 10) || 0;
    return type === VersionType.MAJOR ? `${major + 1}.0` : `${major}.${minor + 1}`;
  }
}
