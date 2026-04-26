import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  feedbackComment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a FeedbackComment', async () => {
      const dto = { recommendationId: 'rec-1', content: 'Looks good' };
      const expected = {
        id: 'comment-1',
        recommendationId: 'rec-1',
        userId: 'user-1',
        content: 'Looks good',
        parentId: null,
        replies: [],
      };
      mockPrismaService.feedbackComment.create.mockResolvedValue(expected);

      const result = await service.create(dto, 'user-1');

      expect(result).toEqual(expected);
      expect(mockPrismaService.feedbackComment.create).toHaveBeenCalledWith({
        data: {
          recommendationId: 'rec-1',
          parentId: undefined,
          userId: 'user-1',
          content: 'Looks good',
        },
        include: { replies: true },
      });
    });

    it('should include the userId of the creator', async () => {
      const dto = { recommendationId: 'rec-2', content: 'Needs revision' };
      mockPrismaService.feedbackComment.create.mockResolvedValue({
        id: 'comment-2',
        userId: 'author-99',
        ...dto,
        replies: [],
      });

      await service.create(dto, 'author-99');

      expect(mockPrismaService.feedbackComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'author-99' }),
        }),
      );
    });

    it('should set parentId correctly when creating a threaded reply', async () => {
      const dto = {
        recommendationId: 'rec-1',
        parentId: 'comment-1',
        content: 'I agree with this comment',
      };
      const expected = {
        id: 'comment-3',
        recommendationId: 'rec-1',
        parentId: 'comment-1',
        userId: 'user-2',
        content: 'I agree with this comment',
        replies: [],
      };
      mockPrismaService.feedbackComment.create.mockResolvedValue(expected);

      const result = await service.create(dto, 'user-2');

      expect(result.parentId).toBe('comment-1');
      expect(mockPrismaService.feedbackComment.create).toHaveBeenCalledWith({
        data: {
          recommendationId: 'rec-1',
          parentId: 'comment-1',
          userId: 'user-2',
          content: 'I agree with this comment',
        },
        include: { replies: true },
      });
    });
  });

  describe('findByRecommendation', () => {
    it('should return paginated comments for the given recommendation', async () => {
      const items = [
        { id: 'c1', recommendationId: 'rec-1', content: 'First', parentId: null, replies: [] },
        { id: 'c2', recommendationId: 'rec-1', content: 'Second', parentId: null, replies: [] },
      ];
      mockPrismaService.feedbackComment.findMany.mockResolvedValue(items);
      mockPrismaService.feedbackComment.count.mockResolvedValue(2);

      const result = await service.findByRecommendation('rec-1');

      expect(result.data).toEqual(items);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should only return top-level comments (parentId: null)', async () => {
      mockPrismaService.feedbackComment.findMany.mockResolvedValue([]);
      mockPrismaService.feedbackComment.count.mockResolvedValue(0);

      await service.findByRecommendation('rec-1');

      expect(mockPrismaService.feedbackComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recommendationId: 'rec-1', parentId: null },
        }),
      );
    });

    it('should include nested replies ordered by createdAt ascending', async () => {
      mockPrismaService.feedbackComment.findMany.mockResolvedValue([]);
      mockPrismaService.feedbackComment.count.mockResolvedValue(0);

      await service.findByRecommendation('rec-1');

      expect(mockPrismaService.feedbackComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            replies: { orderBy: { createdAt: 'asc' } },
          },
        }),
      );
    });

    it('should respect custom page and limit parameters', async () => {
      mockPrismaService.feedbackComment.findMany.mockResolvedValue([]);
      mockPrismaService.feedbackComment.count.mockResolvedValue(50);

      const result = await service.findByRecommendation('rec-1', 2, 10);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(mockPrismaService.feedbackComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update comment status to RESOLVED', async () => {
      const existing = { id: 'comment-1', content: 'Test', status: 'OPEN' };
      const updated = { ...existing, status: 'RESOLVED' };
      mockPrismaService.feedbackComment.findUnique.mockResolvedValue(existing);
      mockPrismaService.feedbackComment.update.mockResolvedValue(updated);

      const result = await service.updateStatus('comment-1', { status: 'RESOLVED' });

      expect(result.status).toBe('RESOLVED');
      expect(mockPrismaService.feedbackComment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { status: 'RESOLVED' },
      });
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      mockPrismaService.feedbackComment.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent-id', { status: 'RESOLVED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update comment status to REJECTED', async () => {
      const existing = { id: 'comment-2', content: 'Another', status: 'OPEN' };
      const updated = { ...existing, status: 'REJECTED' };
      mockPrismaService.feedbackComment.findUnique.mockResolvedValue(existing);
      mockPrismaService.feedbackComment.update.mockResolvedValue(updated);

      const result = await service.updateStatus('comment-2', { status: 'REJECTED' });

      expect(result.status).toBe('REJECTED');
    });
  });

  describe('remove', () => {
    it('should delete a comment successfully', async () => {
      const existing = { id: 'comment-1', content: 'To be deleted' };
      mockPrismaService.feedbackComment.findUnique.mockResolvedValue(existing);
      mockPrismaService.feedbackComment.delete.mockResolvedValue(existing);

      const result = await service.remove('comment-1');

      expect(result).toEqual(existing);
      expect(mockPrismaService.feedbackComment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      mockPrismaService.feedbackComment.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('should not call delete when the comment is not found', async () => {
      mockPrismaService.feedbackComment.findUnique.mockResolvedValue(null);

      await service.remove('missing-id').catch(() => {});

      expect(mockPrismaService.feedbackComment.delete).not.toHaveBeenCalled();
    });
  });
});
