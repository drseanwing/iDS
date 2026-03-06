import { Injectable, NotFoundException } from '@nestjs/common';
import { CommentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreateCommentDto, UpdateCommentStatusDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCommentDto, userId: string) {
    return this.prisma.feedbackComment.create({
      data: {
        recommendationId: dto.recommendationId,
        parentId: dto.parentId,
        userId,
        content: dto.content,
      },
      include: { replies: true },
    });
  }

  async findByRecommendation(recommendationId: string, page = 1, limit = 50) {
    const where = { recommendationId, parentId: null };
    const [data, total] = await Promise.all([
      this.prisma.feedbackComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          replies: { orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.feedbackComment.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async updateStatus(id: string, dto: UpdateCommentStatusDto) {
    const comment = await this.prisma.feedbackComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException(`Comment ${id} not found`);
    return this.prisma.feedbackComment.update({
      where: { id },
      data: { status: dto.status as CommentStatus },
    });
  }

  async remove(id: string) {
    const comment = await this.prisma.feedbackComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException(`Comment ${id} not found`);
    return this.prisma.feedbackComment.delete({ where: { id } });
  }
}
