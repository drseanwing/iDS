import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';

@Injectable()
export class SubscribersService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(guidelineId: string, dto: CreateSubscriberDto) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id: guidelineId },
      select: { id: true, enableSubscriptions: true },
    });

    if (!guideline) {
      throw new NotFoundException(`Guideline ${guidelineId} not found`);
    }

    if (!guideline.enableSubscriptions) {
      throw new ForbiddenException('Subscriptions are disabled for this guideline');
    }

    return this.prisma.subscriber.upsert({
      where: {
        guidelineId_email: { guidelineId, email: dto.email },
      },
      update: {},
      create: {
        guidelineId,
        email: dto.email,
      },
    });
  }

  async findAll(guidelineId: string, page = 1, limit = 20) {
    const where = { guidelineId };
    const [data, total] = await Promise.all([
      this.prisma.subscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscriber.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async remove(guidelineId: string, id: string) {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: { id, guidelineId },
    });

    if (!subscriber) {
      throw new NotFoundException(`Subscriber ${id} not found`);
    }

    return this.prisma.subscriber.delete({ where: { id } });
  }
}
