import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        description: dto.description,
        logoUrl: dto.logoUrl,
      },
    });
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.organization.count(),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: true,
        _count: { select: { guidelines: true } },
      },
    });
    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }
    return organization;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findOne(id);
    const data: Prisma.OrganizationUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.organization.delete({
      where: { id },
    });
  }
}
