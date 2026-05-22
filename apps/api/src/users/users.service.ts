import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string): Promise<{ id: string; email: string; displayName: string }[]> {
    if (!q || q.length < 2) return [];
    return this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, displayName: true },
      take: 10,
    });
  }
}
