import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreatePicoDto } from './dto/create-pico.dto';
import { UpdatePicoDto } from './dto/update-pico.dto';
import { CreatePicoCodeDto } from './dto/create-pico-code.dto';

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
        fhirMeta: (dto.fhirMeta ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async findByGuideline(guidelineId: string, page = 1, limit = 20) {
    const where = { guidelineId, isDeleted: false };
    const [data, total] = await Promise.all([
      this.prisma.pico.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          outcomes: {
            where: { isDeleted: false },
            orderBy: { ordering: 'asc' },
          },
        },
      }),
      this.prisma.pico.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
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
    const data: Prisma.PicoUpdateInput = {};
    if (dto.population !== undefined) data.population = dto.population;
    if (dto.intervention !== undefined) data.intervention = dto.intervention;
    if (dto.comparator !== undefined) data.comparator = dto.comparator;
    if (dto.narrativeSummary !== undefined) data.narrativeSummary = dto.narrativeSummary;
    if (dto.fhirMeta !== undefined) data.fhirMeta = dto.fhirMeta as Prisma.InputJsonValue;
    return this.prisma.pico.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.pico.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async addCode(picoId: string, dto: CreatePicoCodeDto) {
    await this.findOne(picoId);
    return this.prisma.picoCode.create({
      data: {
        picoId,
        codeSystem: dto.codeSystem as any,
        code: dto.code,
        display: dto.display,
        element: dto.element as any,
      },
    });
  }

  async removeCode(picoId: string, codeId: string) {
    const existing = await this.prisma.picoCode.findUnique({ where: { id: codeId } });
    if (!existing || existing.picoId !== picoId) {
      throw new NotFoundException(`PicoCode ${codeId} not found on PICO ${picoId}`);
    }
    return this.prisma.picoCode.delete({ where: { id: codeId } });
  }
}
