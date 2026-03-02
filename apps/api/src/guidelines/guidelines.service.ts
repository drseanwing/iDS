import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuidelineDto } from './dto/create-guideline.dto';
import { UpdateGuidelineDto } from './dto/update-guideline.dto';

@Injectable()
export class GuidelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGuidelineDto, userId: string) {
    return this.prisma.guideline.create({
      data: {
        title: dto.title,
        shortName: dto.shortName,
        description: dto.description,
        organizationId: dto.organizationId,
        language: dto.language || 'en',
        guidelineType: (dto.guidelineType as any) || 'ORGANIZATIONAL',
        createdBy: userId,
      },
    });
  }

  async findAll(filters?: { organizationId?: string; isDeleted?: boolean }) {
    return this.prisma.guideline.findMany({
      where: {
        organizationId: filters?.organizationId,
        isDeleted: filters?.isDeleted ?? false,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id },
      include: {
        organization: true,
        sections: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
    });
    if (!guideline) {
      throw new NotFoundException(`Guideline ${id} not found`);
    }
    return guideline;
  }

  async update(id: string, dto: UpdateGuidelineDto) {
    await this.findOne(id); // ensure exists
    return this.prisma.guideline.update({
      where: { id },
      data: dto as any,
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.guideline.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
