import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmrElementDto } from './dto/create-emr-element.dto';
import { UpdateEmrElementDto } from './dto/update-emr-element.dto';

@Injectable()
export class EmrElementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmrElementDto) {
    const recommendation = await this.prisma.recommendation.findUnique({
      where: { id: dto.recommendationId },
    });
    if (!recommendation || recommendation.isDeleted) {
      throw new NotFoundException(
        `Recommendation ${dto.recommendationId} not found`,
      );
    }

    return this.prisma.emrElement.create({
      data: {
        recommendationId: dto.recommendationId,
        elementType: dto.elementType,
        code: dto.code ?? '',
        codeSystem: dto.codeSystem ?? 'SNOMED_CT',
        display: dto.display,
        implementationDescription: dto.notes,
      },
    });
  }

  async findByRecommendation(recommendationId: string) {
    return this.prisma.emrElement.findMany({
      where: { recommendationId },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: string) {
    const element = await this.prisma.emrElement.findUnique({ where: { id } });
    if (!element) {
      throw new NotFoundException(`EmrElement ${id} not found`);
    }
    return element;
  }

  async update(id: string, dto: UpdateEmrElementDto) {
    const existing = await this.prisma.emrElement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`EmrElement ${id} not found`);
    }

    return this.prisma.emrElement.update({
      where: { id },
      data: {
        ...(dto.elementType !== undefined && { elementType: dto.elementType }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.codeSystem !== undefined && { codeSystem: dto.codeSystem }),
        ...(dto.display !== undefined && { display: dto.display }),
        ...(dto.notes !== undefined && {
          implementationDescription: dto.notes,
        }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.emrElement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`EmrElement ${id} not found`);
    }
    return this.prisma.emrElement.delete({ where: { id } });
  }
}
