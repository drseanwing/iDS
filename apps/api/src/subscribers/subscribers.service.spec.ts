import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  guideline: {
    findUnique: jest.fn(),
  },
  subscriber: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
};

describe('SubscribersService', () => {
  let service: SubscribersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscribersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SubscribersService>(SubscribersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // subscribe
  // -------------------------------------------------------------------------

  describe('subscribe', () => {
    const guidelineId = 'guideline-uuid-1';
    const dto = { email: 'user@example.com' };

    it('creates a subscriber when subscriptions are enabled', async () => {
      const createdSubscriber = {
        id: 'sub-uuid-1',
        guidelineId,
        email: dto.email,
        subscribedAt: new Date(),
      };

      mockPrismaService.guideline.findUnique.mockResolvedValue({
        id: guidelineId,
        enableSubscriptions: true,
      });
      mockPrismaService.subscriber.upsert.mockResolvedValue(createdSubscriber);

      const result = await service.subscribe(guidelineId, dto);

      expect(mockPrismaService.subscriber.upsert).toHaveBeenCalledWith({
        where: { guidelineId_email: { guidelineId, email: dto.email } },
        update: {},
        create: { guidelineId, email: dto.email },
      });
      expect(result).toEqual(createdSubscriber);
    });

    it('throws ForbiddenException when subscriptions are disabled', async () => {
      mockPrismaService.guideline.findUnique.mockResolvedValue({
        id: guidelineId,
        enableSubscriptions: false,
      });

      await expect(service.subscribe(guidelineId, dto)).rejects.toThrow(
        new ForbiddenException('Subscriptions are disabled for this guideline'),
      );

      expect(mockPrismaService.subscriber.upsert).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when guideline does not exist', async () => {
      mockPrismaService.guideline.findUnique.mockResolvedValue(null);

      await expect(service.subscribe(guidelineId, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    const guidelineId = 'guideline-uuid-1';

    it('returns a paginated list of subscribers', async () => {
      const subscribers = [
        { id: 'sub-1', guidelineId, email: 'a@example.com', subscribedAt: new Date() },
        { id: 'sub-2', guidelineId, email: 'b@example.com', subscribedAt: new Date() },
      ];

      mockPrismaService.subscriber.findMany.mockResolvedValue(subscribers);
      mockPrismaService.subscriber.count.mockResolvedValue(2);

      const result = await service.findAll(guidelineId, 1, 20);

      expect(result.data).toEqual(subscribers);
      expect(result.meta.total).toBe(2);
      expect(mockPrismaService.subscriber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guidelineId } }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    const guidelineId = 'guideline-uuid-1';
    const subscriberId = 'sub-uuid-1';

    it('deletes subscriber when found', async () => {
      const subscriber = { id: subscriberId, guidelineId, email: 'user@example.com', subscribedAt: new Date() };

      mockPrismaService.subscriber.findFirst.mockResolvedValue(subscriber);
      mockPrismaService.subscriber.delete.mockResolvedValue(subscriber);

      const result = await service.remove(guidelineId, subscriberId);

      expect(mockPrismaService.subscriber.delete).toHaveBeenCalledWith({
        where: { id: subscriberId },
      });
      expect(result).toEqual(subscriber);
    });

    it('throws NotFoundException when subscriber does not exist', async () => {
      mockPrismaService.subscriber.findFirst.mockResolvedValue(null);

      await expect(service.remove(guidelineId, subscriberId)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.subscriber.delete).not.toHaveBeenCalled();
    });
  });
});
