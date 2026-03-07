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

  async findAll(filters?: { guidelineId?: string; search?: string }, page = 1, limit = 20) {
    const where: Prisma.ReferenceWhereInput = { isDeleted: false };
    if (filters?.guidelineId) where.guidelineId = filters.guidelineId;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { authors: { contains: filters.search, mode: 'insensitive' } },
        { doi: { contains: filters.search, mode: 'insensitive' } },
        { pubmedId: { contains: filters.search, mode: 'insensitive' } },
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
          sectionPlacements: { select: { sectionId: true, section: { select: { title: true } } } },
          outcomeLinks: { select: { outcomeId: true, outcome: { select: { title: true } } } },
        },
      }),
      this.prisma.reference.count({ where }),
    ]);

    // When filtering by guideline, compute and attach reference numbers
    if (filters?.guidelineId) {
      const numberMap = await this.computeReferenceNumbers(filters.guidelineId);
      const numbered = data.map((ref) => ({
        ...ref,
        referenceNumber: numberMap.get(ref.id) ?? null,
      }));
      return new PaginatedResponseDto(numbered, total, page, limit);
    }

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findByGuideline(guidelineId: string, page = 1, limit = 20) {
    return this.findAll({ guidelineId }, page, limit);
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

  /**
   * Compute reference numbers for a guideline by depth-first traversal of the section tree.
   * Numbers are assigned sequentially (1, 2, 3...) based on order of first appearance.
   * References are not stored with numbers — they are computed on-read.
   */
  async computeReferenceNumbers(guidelineId: string): Promise<Map<string, number>> {
    // Fetch all non-deleted sections with their sectionReferences ordered by ordering
    const sections = await this.prisma.section.findMany({
      where: { guidelineId, isDeleted: false },
      orderBy: { ordering: 'asc' },
      include: {
        sectionReferences: {
          orderBy: { ordering: 'asc' },
        },
      },
    });

    // Build section tree using an interface for tree nodes
    type SectionNode = (typeof sections)[number] & { children: SectionNode[] };

    const byId = new Map<string, SectionNode>(
      sections.map((s) => [s.id, { ...s, children: [] }]),
    );
    const roots: SectionNode[] = [];

    for (const section of sections) {
      const node = byId.get(section.id)!;
      if (section.parentId && byId.has(section.parentId)) {
        byId.get(section.parentId)!.children.push(node);
      } else if (!section.parentId) {
        roots.push(node);
      }
    }

    // Sort children at each level by ordering (already sorted from query, but ensure tree order)
    for (const node of byId.values()) {
      node.children.sort((a, b) => a.ordering - b.ordering);
    }

    // Depth-first traversal to assign reference numbers
    const referenceNumbers = new Map<string, number>();
    let counter = 0;

    const traverse = (node: SectionNode) => {
      if (!node.excludeFromNumbering) {
        for (const sr of node.sectionReferences) {
          if (!referenceNumbers.has(sr.referenceId)) {
            referenceNumbers.set(sr.referenceId, ++counter);
          }
        }
      }
      for (const child of node.children) {
        traverse(child);
      }
    };

    for (const root of roots) {
      traverse(root);
    }

    return referenceNumbers;
  }
}
