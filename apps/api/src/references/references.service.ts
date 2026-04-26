import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, StudyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';

export interface PubmedResult {
  pubmedId: string;
  title: string;
  authors: string;
  year: number | null;
  abstract: string | null;
  doi: string | null;
  studyType: 'OTHER';
}

@Injectable()
export class ReferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

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

  // -----------------------------------------------------------------------
  // Reference Attachments
  // -----------------------------------------------------------------------

  async uploadAttachment(
    referenceId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    uploadedBy: string,
  ) {
    const ref = await this.prisma.reference.findUnique({ where: { id: referenceId } });
    if (!ref || ref.isDeleted) throw new NotFoundException(`Reference ${referenceId} not found`);

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `references/${referenceId}/attachments/${crypto.randomUUID()}-${safeName}`;
    await this.storage.upload(key, file.buffer, file.mimetype || 'application/octet-stream');

    return this.prisma.referenceAttachment.create({
      data: {
        referenceId,
        fileName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        s3Key: key,
        uploadedBy,
      },
    });
  }

  async listAttachments(referenceId: string) {
    const ref = await this.prisma.reference.findUnique({ where: { id: referenceId } });
    if (!ref || ref.isDeleted) throw new NotFoundException(`Reference ${referenceId} not found`);

    return this.prisma.referenceAttachment.findMany({
      where: { referenceId },
      orderBy: { uploadedAt: 'asc' },
    });
  }

  async getAttachmentDownloadBuffer(referenceId: string, attachmentId: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const attachment = await this.prisma.referenceAttachment.findFirst({
      where: { id: attachmentId, referenceId },
    });
    if (!attachment) throw new NotFoundException(`Attachment ${attachmentId} not found`);

    const buffer = await this.storage.download(attachment.s3Key);
    return { buffer, fileName: attachment.fileName, mimeType: attachment.mimeType };
  }

  async deleteAttachment(referenceId: string, attachmentId: string): Promise<void> {
    const attachment = await this.prisma.referenceAttachment.findFirst({
      where: { id: attachmentId, referenceId },
    });
    if (!attachment) throw new NotFoundException(`Attachment ${attachmentId} not found`);

    await this.storage.delete(attachment.s3Key);
    await this.prisma.referenceAttachment.delete({ where: { id: attachmentId } });
  }

  // -----------------------------------------------------------------------
  // PubMed Lookup (PubmedImportService — lightweight implementation)
  // -----------------------------------------------------------------------

  async pubmedLookup(pmid: string): Promise<PubmedResult> {
    // Step 1: ESummary — title, authors, year, journal, DOI
    const summaryUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(pmid)}&retmode=json`;

    let summaryJson: any;
    try {
      const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(5000) });
      summaryJson = await summaryRes.json();
    } catch {
      throw new NotFoundException(`PubMed PMID ${pmid} could not be retrieved`);
    }

    const article = summaryJson?.result?.[pmid];
    if (!article || article.error) {
      throw new NotFoundException(`PubMed PMID ${pmid} not found`);
    }

    // Authors: each entry has a `name` field like "Smith JA"
    const authorsArr: string[] = Array.isArray(article.authors)
      ? article.authors.map((a: { name: string }) => a.name).filter(Boolean)
      : [];
    const authors = authorsArr.join(', ');

    // Year: first 4 digits of pubdate (e.g. "2023 Jan 5" → 2023)
    const pubdate: string = article.pubdate ?? '';
    const yearMatch = pubdate.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

    // DOI: elocationid may look like "doi: 10.1000/xyz"
    const elocationid: string = article.elocationid ?? '';
    const doiMatch = elocationid.match(/doi:\s*(\S+)/i);
    const doi = doiMatch ? doiMatch[1] : null;

    const title: string = article.title ?? '';

    // Step 2: EFetch — abstract (best-effort; failures do NOT fail the request)
    let abstract: string | null = null;
    try {
      const fetchUrl =
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${encodeURIComponent(pmid)}&retmode=xml&rettype=abstract`;
      const fetchRes = await fetch(fetchUrl, { signal: AbortSignal.timeout(5000) });
      const xml = await fetchRes.text();

      const abstractRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
      const sections: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = abstractRegex.exec(xml)) !== null) {
        if (match[1]) sections.push(match[1]);
      }
      if (sections.length > 0) {
        abstract = sections.join('\n\n');
      }
    } catch {
      // Abstract fetch failure is non-fatal — leave abstract as null
    }

    return {
      pubmedId: pmid,
      title,
      authors,
      year,
      abstract,
      doi,
      studyType: 'OTHER',
    };
  }
}
