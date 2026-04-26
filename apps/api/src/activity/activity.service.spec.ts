import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  activityLogEntry: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create an ActivityLogEntry when guidelineId is present', async () => {
      const input = {
        guidelineId: 'guide-1',
        userId: 'user-1',
        actionType: 'CREATE',
        entityType: 'Section',
        entityId: 'section-1',
        entityTitle: 'Intro',
      };
      const expected = { id: 'entry-1', ...input };
      mockPrismaService.activityLogEntry.create.mockResolvedValue(expected);

      const result = await service.log(input);

      expect(result).toEqual(expected);
      expect(mockPrismaService.activityLogEntry.create).toHaveBeenCalledWith({
        data: input,
      });
    });

    it('should not throw when called without optional fields (fire-and-forget best-effort)', async () => {
      const input = {
        guidelineId: 'guide-1',
        userId: 'user-2',
        actionType: 'UPDATE',
        entityType: 'Recommendation',
        entityId: 'rec-1',
      };
      mockPrismaService.activityLogEntry.create.mockResolvedValue({ id: 'entry-2', ...input });

      await expect(service.log(input)).resolves.not.toThrow();
    });

    it('should pass changeDetails and comment when provided', async () => {
      const input = {
        guidelineId: 'guide-1',
        userId: 'user-3',
        actionType: 'DELETE',
        entityType: 'Section',
        entityId: 'section-2',
        changeDetails: { before: 'old', after: 'new' },
        comment: 'Removed outdated section',
      };
      mockPrismaService.activityLogEntry.create.mockResolvedValue({ id: 'entry-3', ...input });

      await service.log(input);

      expect(mockPrismaService.activityLogEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changeDetails: input.changeDetails,
          comment: input.comment,
        }),
      });
    });
  });

  describe('findByGuideline', () => {
    it('should return paginated entries filtered by guidelineId', async () => {
      const items = [
        { id: 'e1', guidelineId: 'guide-1', actionType: 'CREATE', user: { id: 'u1', displayName: 'Alice', email: 'alice@example.com' } },
        { id: 'e2', guidelineId: 'guide-1', actionType: 'UPDATE', user: { id: 'u1', displayName: 'Alice', email: 'alice@example.com' } },
      ];
      mockPrismaService.activityLogEntry.findMany.mockResolvedValue(items);
      mockPrismaService.activityLogEntry.count.mockResolvedValue(2);

      const result = await service.findByGuideline('guide-1');

      expect(result.data).toEqual(items);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(mockPrismaService.activityLogEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guidelineId: 'guide-1' },
          orderBy: { timestamp: 'desc' },
          skip: 0,
          take: 50,
        }),
      );
    });

    it('should apply entityType filter when provided', async () => {
      mockPrismaService.activityLogEntry.findMany.mockResolvedValue([]);
      mockPrismaService.activityLogEntry.count.mockResolvedValue(0);

      await service.findByGuideline('guide-1', { entityType: 'Section' });

      expect(mockPrismaService.activityLogEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guidelineId: 'guide-1', entityType: 'Section' },
        }),
      );
    });

    it('should apply userId filter when provided', async () => {
      mockPrismaService.activityLogEntry.findMany.mockResolvedValue([]);
      mockPrismaService.activityLogEntry.count.mockResolvedValue(0);

      await service.findByGuideline('guide-1', { userId: 'user-42' });

      expect(mockPrismaService.activityLogEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guidelineId: 'guide-1', userId: 'user-42' },
        }),
      );
    });

    it('should apply entityType and userId filters simultaneously', async () => {
      mockPrismaService.activityLogEntry.findMany.mockResolvedValue([]);
      mockPrismaService.activityLogEntry.count.mockResolvedValue(0);

      await service.findByGuideline('guide-1', { entityType: 'Recommendation', userId: 'user-5' });

      expect(mockPrismaService.activityLogEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guidelineId: 'guide-1', entityType: 'Recommendation', userId: 'user-5' },
        }),
      );
    });

    it('should respect custom page and limit parameters', async () => {
      mockPrismaService.activityLogEntry.findMany.mockResolvedValue([]);
      mockPrismaService.activityLogEntry.count.mockResolvedValue(100);

      const result = await service.findByGuideline('guide-1', {}, 3, 10);

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(mockPrismaService.activityLogEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should include user details in the query', async () => {
      mockPrismaService.activityLogEntry.findMany.mockResolvedValue([]);
      mockPrismaService.activityLogEntry.count.mockResolvedValue(0);

      await service.findByGuideline('guide-1');

      expect(mockPrismaService.activityLogEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { user: { select: { id: true, displayName: true, email: true } } },
        }),
      );
    });
  });
});
