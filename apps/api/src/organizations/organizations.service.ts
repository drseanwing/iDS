import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // TODO: Implement with Prisma once schema is generated
    return [];
  }

  async findOne(id: string) {
    // TODO: Implement with Prisma once schema is generated
    return { id };
  }
}
