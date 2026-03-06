import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto';
import { CreatePollDto, CastVoteDto } from './dto/create-poll.dto';

@Injectable()
export class PollsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePollDto, userId: string) {
    return this.prisma.poll.create({
      data: {
        guidelineId: dto.guidelineId,
        recommendationId: dto.recommendationId,
        title: dto.title,
        pollType: dto.pollType as any,
        options: dto.options ? (dto.options as any) : [],
        createdBy: userId,
      },
      include: { votes: true },
    });
  }

  async findByGuideline(guidelineId: string, page = 1, limit = 20) {
    const where = { guidelineId };
    const [data, total] = await Promise.all([
      this.prisma.poll.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { votes: true } },
        },
      }),
      this.prisma.poll.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id },
      include: {
        votes: {
          select: {
            id: true,
            userId: true,
            value: true,
            comment: true,
            votedAt: true,
          },
        },
        _count: { select: { votes: true } },
      },
    });
    if (!poll) throw new NotFoundException(`Poll ${id} not found`);
    return poll;
  }

  async castVote(pollId: string, dto: CastVoteDto, userId: string) {
    const poll = await this.prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) throw new NotFoundException(`Poll ${pollId} not found`);
    if (!poll.isActive) throw new ForbiddenException('This poll is closed');

    // Check COI exclusion: if user has any intervention conflict with excludeFromVoting=true
    // for this guideline, they cannot vote.
    const excludedConflict = await this.prisma.coiInterventionConflict.findFirst({
      where: {
        excludeFromVoting: true,
        coiRecord: {
          guidelineId: poll.guidelineId,
          userId,
        },
      },
    });
    if (excludedConflict) {
      throw new ForbiddenException(
        'You are excluded from voting on this guideline due to a conflict of interest',
      );
    }

    // Upsert: allow user to change their vote
    return this.prisma.pollVote.upsert({
      where: { pollId_userId: { pollId, userId } },
      create: {
        pollId,
        userId,
        value: dto.value,
        comment: dto.comment,
      },
      update: {
        value: dto.value,
        comment: dto.comment,
      },
    });
  }

  async close(id: string) {
    const poll = await this.prisma.poll.findUnique({ where: { id } });
    if (!poll) throw new NotFoundException(`Poll ${id} not found`);

    return this.prisma.poll.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getResults(id: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id },
      include: {
        votes: {
          select: {
            userId: true,
            value: true,
            comment: true,
            votedAt: true,
          },
        },
      },
    });
    if (!poll) throw new NotFoundException(`Poll ${id} not found`);

    const totalVotes = poll.votes.length;
    const options = (poll.options as any[]) ?? [];

    // Build aggregation: count how many votes match each option label
    const optionCounts = options.map((opt: any) => {
      const count = poll.votes.filter(
        (v) => (v.value as any) === opt.label || (v.value as any)?.label === opt.label,
      ).length;
      return {
        label: opt.label,
        ordering: opt.ordering ?? 0,
        count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 10000) / 100 : 0,
      };
    });

    return {
      pollId: poll.id,
      title: poll.title,
      pollType: poll.pollType,
      isActive: poll.isActive,
      totalVotes,
      options: optionCounts,
      votes: poll.votes,
    };
  }
}
