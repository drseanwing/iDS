import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, StudyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';

@Injectable()
export class ReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReferenceDto) {
    return this.prisma.reference.create({
      data: {
        guidelineId: dto.guidelineId,
        title: dto.title,
        authors: dto.authors,
        year: dto.year,
        abstract: dto.abstract,
        pubmedId: dto.pubmedId,
        doi: dto.doi,
        url: dto.url,
        studyType: (dto.studyType as StudyType) || StudyType.OTHER,
        fhirMeta: (dto.fhirMeta ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async findByGuideline(guidelineId: string, page = 1, limit = 20) {
    const where = { guidelineId, isDeleted: false };
    const [data, total] = await Promise.all([
      this.prisma.reference.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.reference.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findAll(page = 1, limit = 50, search?: string) {
    const where: Prisma.ReferenceWhereInput = { isDeleted: false };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { authors: { contains: search, mode: 'insensitive' } },
        { doi: { contains: search, mode: 'insensitive' } },
        { pubmedId: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.reference.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          guideline: { select: { id: true, title: true, shortName: true } },
          sectionPlacements: {
            include: { section: { select: { id: true, title: true } } },
          },
          outcomeLinks: {
            include: { outcome: { select: { id: true, title: true } } },
          },
        },
      }),
      this.prisma.reference.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string) {
    const ref = await this.prisma.reference.findUnique({
      where: { id },
      include: {
        sectionPlacements: true,
        outcomeLinks: true,
        attachments: true,
      },
    });
    if (!ref) {
      throw new NotFoundException(`Reference ${id} not found`);
    }
    return ref;
  }

  async update(id: string, dto: UpdateReferenceDto) {
    await this.findOne(id);
    const data: Prisma.ReferenceUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.authors !== undefined) data.authors = dto.authors;
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.abstract !== undefined) data.abstract = dto.abstract;
    if (dto.pubmedId !== undefined) data.pubmedId = dto.pubmedId;
    if (dto.doi !== undefined) data.doi = dto.doi;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.studyType !== undefined) data.studyType = dto.studyType as StudyType;
    if (dto.fhirMeta !== undefined) data.fhirMeta = dto.fhirMeta as Prisma.InputJsonValue;
    return this.prisma.reference.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    const ref = await this.findOne(id);
    // Business rule: references in use cannot be deleted
    if (ref.outcomeLinks.length > 0 || ref.sectionPlacements.length > 0) {
      throw new BadRequestException('Cannot delete reference that is in use');
    }
    return this.prisma.reference.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
