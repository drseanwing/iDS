import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GuidelinesService } from './guidelines.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  guideline: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('GuidelinesService', () => {
  let service: GuidelinesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuidelinesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GuidelinesService>(GuidelinesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a guideline', async () => {
      const dto = { title: 'Test Guideline' };
      const expected = { id: 'uuid-1', ...dto };
      mockPrismaService.guideline.create.mockResolvedValue(expected);

      const result = await service.create(dto, 'user-id');
      expect(result).toEqual(expected);
      expect(mockPrismaService.guideline.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: 'Test Guideline' }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted guidelines', async () => {
      const items = [{ id: '1', title: 'G1' }];
      mockPrismaService.guideline.findMany.mockResolvedValue(items);
      mockPrismaService.guideline.count.mockResolvedValue(1);

      const result = await service.findAll();
      expect(result.data).toEqual(items);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.guideline.findMany).toHaveBeenCalledWith({
        where: { organizationId: undefined, isDeleted: false },
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('findOne', () => {
    it('should return a guideline by id', async () => {
      const expected = { id: 'uuid-1', title: 'Test' };
      mockPrismaService.guideline.findUnique.mockResolvedValue(expected);

      const result = await service.findOne('uuid-1');
      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException for missing guideline', async () => {
      mockPrismaService.guideline.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft-delete a guideline', async () => {
      const existing = { id: 'uuid-1', title: 'Test' };
      mockPrismaService.guideline.findUnique.mockResolvedValue(existing);
      mockPrismaService.guideline.update.mockResolvedValue({
        ...existing,
        isDeleted: true,
      });

      const result = await service.softDelete('uuid-1');
      expect(result.isDeleted).toBe(true);
      expect(mockPrismaService.guideline.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { isDeleted: true },
      });
    });
  });
});
