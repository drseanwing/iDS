import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OutcomesService } from './outcomes.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  outcome: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('OutcomesService', () => {
  let service: OutcomesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutcomesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OutcomesService>(OutcomesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an outcome', async () => {
      const dto = { picoId: 'pico-uuid', title: 'Mortality', outcomeType: 'DICHOTOMOUS' as any };
      const expected = { id: 'uuid-1', ...dto };
      mockPrismaService.outcome.create.mockResolvedValue(expected);

      const result = await service.create(dto);
      expect(result).toEqual(expected);
      expect(mockPrismaService.outcome.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: 'Mortality', picoId: 'pico-uuid' }),
      });
    });
  });

  describe('findByPico', () => {
    it('should return all non-deleted outcomes for a PICO', async () => {
      const items = [{ id: '1', title: 'Mortality' }];
      mockPrismaService.outcome.findMany.mockResolvedValue(items);
      mockPrismaService.outcome.count.mockResolvedValue(1);

      const result = await service.findByPico('pico-uuid');
      expect(result.data).toEqual(items);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.outcome.findMany).toHaveBeenCalledWith({
        where: { picoId: 'pico-uuid', isDeleted: false },
        orderBy: { ordering: 'asc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('findOne', () => {
    it('should return an outcome by id', async () => {
      const expected = { id: 'uuid-1', title: 'Mortality' };
      mockPrismaService.outcome.findUnique.mockResolvedValue(expected);

      const result = await service.findOne('uuid-1');
      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException for missing outcome', async () => {
      mockPrismaService.outcome.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft-delete an outcome', async () => {
      const existing = { id: 'uuid-1', title: 'Mortality' };
      mockPrismaService.outcome.findUnique.mockResolvedValue(existing);
      mockPrismaService.outcome.update.mockResolvedValue({
        ...existing,
        isDeleted: true,
      });

      const result = await service.softDelete('uuid-1');
      expect(result.isDeleted).toBe(true);
      expect(mockPrismaService.outcome.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { isDeleted: true },
      });
    });
  });
});
