import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmrElementsService } from './emr-elements.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  recommendation: {
    findUnique: jest.fn(),
  },
  emrElement: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('EmrElementsService', () => {
  let service: EmrElementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmrElementsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EmrElementsService>(EmrElementsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an EmrElement when the recommendation exists', async () => {
      const dto = {
        recommendationId: 'rec-1',
        elementType: 'INTERVENTION' as const,
        display: 'Prescribe Aspirin',
        code: '7947003',
        codeSystem: 'SNOMED_CT' as const,
      };
      const recommendation = { id: 'rec-1', isDeleted: false };
      const expected = { id: 'elem-1', ...dto };

      mockPrismaService.recommendation.findUnique.mockResolvedValue(recommendation);
      mockPrismaService.emrElement.create.mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(result).toEqual(expected);
      expect(mockPrismaService.recommendation.findUnique).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
      });
      expect(mockPrismaService.emrElement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recommendationId: 'rec-1',
            display: 'Prescribe Aspirin',
          }),
        }),
      );
    });

    it('should throw NotFoundException when recommendation does not exist', async () => {
      mockPrismaService.recommendation.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          recommendationId: 'nonexistent',
          elementType: 'INTERVENTION' as const,
          display: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.emrElement.create).not.toHaveBeenCalled();
    });
  });

  describe('findByRecommendation', () => {
    it('should return all elements for a recommendation', async () => {
      const elements = [
        { id: 'e1', recommendationId: 'rec-1', display: 'Element 1' },
        { id: 'e2', recommendationId: 'rec-1', display: 'Element 2' },
      ];
      mockPrismaService.emrElement.findMany.mockResolvedValue(elements);

      const result = await service.findByRecommendation('rec-1');

      expect(result).toEqual(elements);
      expect(mockPrismaService.emrElement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recommendationId: 'rec-1' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an element by id', async () => {
      const element = { id: 'elem-1', display: 'Prescribe Aspirin' };
      mockPrismaService.emrElement.findUnique.mockResolvedValue(element);

      const result = await service.findOne('elem-1');

      expect(result).toEqual(element);
    });

    it('should throw NotFoundException when element does not exist', async () => {
      mockPrismaService.emrElement.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an existing EmrElement', async () => {
      const existing = { id: 'elem-1', display: 'Old display' };
      const updated = { id: 'elem-1', display: 'New display' };

      mockPrismaService.emrElement.findUnique.mockResolvedValue(existing);
      mockPrismaService.emrElement.update.mockResolvedValue(updated);

      const result = await service.update('elem-1', { display: 'New display' });

      expect(result).toEqual(updated);
      expect(mockPrismaService.emrElement.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'elem-1' } }),
      );
    });

    it('should throw NotFoundException when updating a non-existent element', async () => {
      mockPrismaService.emrElement.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { display: 'Any' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.emrElement.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should hard-delete an existing EmrElement', async () => {
      const existing = { id: 'elem-1', display: 'Prescribe Aspirin' };
      mockPrismaService.emrElement.findUnique.mockResolvedValue(existing);
      mockPrismaService.emrElement.delete.mockResolvedValue(existing);

      const result = await service.remove('elem-1');

      expect(result).toEqual(existing);
      expect(mockPrismaService.emrElement.delete).toHaveBeenCalledWith({
        where: { id: 'elem-1' },
      });
    });

    it('should throw NotFoundException when removing a non-existent element', async () => {
      mockPrismaService.emrElement.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.emrElement.delete).not.toHaveBeenCalled();
    });
  });
});
