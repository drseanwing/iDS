import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PollsService } from './polls.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  poll: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  pollVote: {
    upsert: jest.fn(),
  },
  coiInterventionConflict: {
    findFirst: jest.fn(),
  },
};

describe('PollsService', () => {
  let service: PollsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PollsService>(PollsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a poll with correct pollType and options', async () => {
      const dto = {
        guidelineId: 'g-1',
        title: 'Strength vote',
        pollType: 'RATING',
        options: [{ label: 'Strong' }, { label: 'Conditional' }],
      };
      const expected = { id: 'poll-1', ...dto, votes: [] };
      mockPrismaService.poll.create.mockResolvedValue(expected);

      const result = await service.create(dto, 'user-1');

      expect(result).toEqual(expected);
      expect(mockPrismaService.poll.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pollType: 'RATING', createdBy: 'user-1' }),
        }),
      );
    });
  });

  describe('findByGuideline', () => {
    it('returns paginated polls for a guideline', async () => {
      const polls = [{ id: 'poll-1', title: 'P1' }];
      mockPrismaService.poll.findMany.mockResolvedValue(polls);
      mockPrismaService.poll.count.mockResolvedValue(1);

      const result = await service.findByGuideline('g-1');

      expect(result.data).toEqual(polls);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.poll.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guidelineId: 'g-1' } }),
      );
    });
  });

  describe('castVote', () => {
    const activePoll = { id: 'poll-1', guidelineId: 'g-1', isActive: true };

    beforeEach(() => {
      mockPrismaService.poll.findUnique.mockResolvedValue(activePoll);
      mockPrismaService.coiInterventionConflict.findFirst.mockResolvedValue(null);
    });

    it('upserts a PollVote record', async () => {
      const vote = { id: 'v-1', pollId: 'poll-1', userId: 'user-1', value: 'Strong' };
      mockPrismaService.pollVote.upsert.mockResolvedValue(vote);

      const result = await service.castVote('poll-1', { value: 'Strong' }, 'user-1');

      expect(result).toEqual(vote);
      expect(mockPrismaService.pollVote.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pollId_userId: { pollId: 'poll-1', userId: 'user-1' } },
          create: expect.objectContaining({ value: 'Strong' }),
          update: expect.objectContaining({ value: 'Strong' }),
        }),
      );
    });

    it('throws ForbiddenException when poll is closed', async () => {
      mockPrismaService.poll.findUnique.mockResolvedValue({ ...activePoll, isActive: false });

      await expect(service.castVote('poll-1', { value: 'X' }, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('close', () => {
    it('sets isActive=false on the poll', async () => {
      mockPrismaService.poll.findUnique.mockResolvedValue({ id: 'poll-1', isActive: true });
      mockPrismaService.poll.update.mockResolvedValue({ id: 'poll-1', isActive: false });

      const result = await service.close('poll-1');

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.poll.update).toHaveBeenCalledWith({
        where: { id: 'poll-1' },
        data: { isActive: false },
      });
    });

    it('throws NotFoundException when poll does not exist', async () => {
      mockPrismaService.poll.findUnique.mockResolvedValue(null);

      await expect(service.close('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for a missing poll', async () => {
      mockPrismaService.poll.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the poll when found', async () => {
      const poll = { id: 'poll-1', title: 'Test', votes: [], _count: { votes: 0 } };
      mockPrismaService.poll.findUnique.mockResolvedValue(poll);

      const result = await service.findOne('poll-1');

      expect(result).toEqual(poll);
    });
  });
});
