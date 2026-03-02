import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePicoDto } from './dto/create-pico.dto';
import { UpdatePicoDto } from './dto/update-pico.dto';

@Injectable()
export class PicosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePicoDto) {
    return this.prisma.pico.create({
      data: {
        guidelineId: dto.guidelineId,
        population: dto.population,
        intervention: dto.intervention,
        comparator: dto.comparator,
        narrativeSummary: dto.narrativeSummary,
      },
    });
  }

  async findByGuideline(guidelineId: string) {
    return this.prisma.pico.findMany({
      where: { guidelineId, isDeleted: false },
      include: {
        outcomes: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
    });
  }

  async findOne(id: string) {
    const pico = await this.prisma.pico.findUnique({
      where: { id },
      include: {
        outcomes: {
          where: { isDeleted: false },
          orderBy: { ordering: 'asc' },
        },
        codes: true,
        practicalIssues: { orderBy: { ordering: 'asc' } },
        recommendationLinks: true,
      },
    });
    if (!pico) {
      throw new NotFoundException(`PICO ${id} not found`);
    }
    return pico;
  }

  async update(id: string, dto: UpdatePicoDto) {
    await this.findOne(id);
    return this.prisma.pico.update({
      where: { id },
      data: dto as any,
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.pico.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
