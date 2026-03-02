import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
        studyType: (dto.studyType as any) || 'OTHER',
      },
    });
  }

  async findByGuideline(guidelineId: string) {
    return this.prisma.reference.findMany({
      where: { guidelineId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
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
    return this.prisma.reference.update({
      where: { id },
      data: dto as any,
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
