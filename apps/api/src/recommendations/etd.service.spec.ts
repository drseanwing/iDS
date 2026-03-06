import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EtdFactorType } from '@prisma/client';
import { EtdService } from './etd.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  recommendation: {
    findUnique: jest.fn(),
  },
  etdFactor: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
  },
  etdJudgment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('EtdService', () => {
  let service: EtdService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtdService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EtdService>(EtdService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrInit', () => {
    it('should throw NotFoundException if recommendation does not exist', async () => {
      mockPrismaService.recommendation.findUnique.mockResolvedValue(null);
      await expect(service.getOrInit('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should return existing factors when all are already created', async () => {
      mockPrismaService.recommendation.findUnique.mockResolvedValue({ id: 'rec-1' });
      const allFactors = Object.values(EtdFactorType).map((ft, i) => ({
        id: `factor-${i}`,
        recommendationId: 'rec-1',
        factorType: ft,
        ordering: i,
        judgments: [],
      }));
      mockPrismaService.etdFactor.findMany.mockResolvedValue(allFactors);

      const result = await service.getOrInit('rec-1');
      expect(result).toEqual(allFactors);
      expect(mockPrismaService.etdFactor.createMany).not.toHaveBeenCalled();
    });

    it('should create missing factors on first call', async () => {
      mockPrismaService.recommendation.findUnique.mockResolvedValue({ id: 'rec-1' });
      // First findMany returns empty (no factors yet)
      // Second findMany (after createMany) returns all factors
      const created = [{ id: 'f-1', factorType: EtdFactorType.BENEFITS_HARMS, judgments: [] }];
      mockPrismaService.etdFactor.findMany
        .mockResolvedValueOnce([]) // existing
        .mockResolvedValueOnce(created); // after creation
      mockPrismaService.etdFactor.createMany.mockResolvedValue({ count: 13 });

      const result = await service.getOrInit('rec-1');
      expect(mockPrismaService.etdFactor.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ factorType: EtdFactorType.BENEFITS_HARMS }),
          expect.objectContaining({ factorType: EtdFactorType.EQUITY }),
          expect.objectContaining({ factorType: EtdFactorType.DESIRABLE_EFFECTS }),
        ]),
        skipDuplicates: true,
      });
      expect(result).toEqual(created);
    });

    it('should only create factors not yet present', async () => {
      mockPrismaService.recommendation.findUnique.mockResolvedValue({ id: 'rec-1' });
      const existing = [
        { id: 'f-1', factorType: EtdFactorType.BENEFITS_HARMS, ordering: 0, judgments: [] },
        { id: 'f-2', factorType: EtdFactorType.QUALITY_OF_EVIDENCE, ordering: 1, judgments: [] },
      ];
      const allFactors = [...existing, { id: 'f-3', factorType: EtdFactorType.PREFERENCES_VALUES }];
      mockPrismaService.etdFactor.findMany
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(allFactors);
      mockPrismaService.etdFactor.createMany.mockResolvedValue({ count: 11 });

      await service.getOrInit('rec-1');

      const createManyCall = mockPrismaService.etdFactor.createMany.mock.calls[0][0];
      const createdTypes = createManyCall.data.map((d: any) => d.factorType);
      expect(createdTypes).not.toContain(EtdFactorType.BENEFITS_HARMS);
      expect(createdTypes).not.toContain(EtdFactorType.QUALITY_OF_EVIDENCE);
      expect(createdTypes).toContain(EtdFactorType.PREFERENCES_VALUES);
    });
  });

  describe('updateFactor', () => {
    it('should throw NotFoundException if factor does not exist', async () => {
      mockPrismaService.etdFactor.findUnique.mockResolvedValue(null);
      await expect(service.updateFactor('nonexistent', {})).rejects.toThrow(NotFoundException);
    });

    it('should update factor content fields', async () => {
      const existing = { id: 'f-1', factorType: EtdFactorType.BENEFITS_HARMS };
      const updated = { ...existing, summaryText: { type: 'doc', content: [] } };
      mockPrismaService.etdFactor.findUnique.mockResolvedValue(existing);
      mockPrismaService.etdFactor.update.mockResolvedValue(updated);

      const result = await service.updateFactor('f-1', {
        summaryText: { type: 'doc', content: [] },
      });

      expect(mockPrismaService.etdFactor.update).toHaveBeenCalledWith({
        where: { id: 'f-1' },
        data: { summaryText: { type: 'doc', content: [] } },
        include: { judgments: true },
      });
      expect(result).toEqual(updated);
    });

    it('should update visibility flags', async () => {
      const existing = { id: 'f-1', factorType: EtdFactorType.EQUITY };
      mockPrismaService.etdFactor.findUnique.mockResolvedValue(existing);
      mockPrismaService.etdFactor.update.mockResolvedValue({ ...existing, summaryPublic: false });

      await service.updateFactor('f-1', { summaryPublic: false });

      expect(mockPrismaService.etdFactor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { summaryPublic: false },
        }),
      );
    });
  });

  describe('addJudgment', () => {
    it('should throw NotFoundException if factor does not exist', async () => {
      mockPrismaService.etdFactor.findUnique.mockResolvedValue(null);
      await expect(
        service.addJudgment('nonexistent', { interventionLabel: 'Drug A' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a judgment for the factor', async () => {
      const factor = { id: 'f-1' };
      const judgment = { id: 'j-1', etdFactorId: 'f-1', interventionLabel: 'Drug A', judgment: null };
      mockPrismaService.etdFactor.findUnique.mockResolvedValue(factor);
      mockPrismaService.etdJudgment.create.mockResolvedValue(judgment);

      const result = await service.addJudgment('f-1', { interventionLabel: 'Drug A' });
      expect(result).toEqual(judgment);
      expect(mockPrismaService.etdJudgment.create).toHaveBeenCalledWith({
        data: { etdFactorId: 'f-1', interventionLabel: 'Drug A' },
      });
    });
  });

  describe('updateJudgment', () => {
    it('should throw NotFoundException if judgment does not exist', async () => {
      mockPrismaService.etdJudgment.findUnique.mockResolvedValue(null);
      await expect(
        service.updateJudgment('nonexistent', { judgment: 'FAVORS_INTERVENTION' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update judgment value and colorCode', async () => {
      const existing = { id: 'j-1', etdFactorId: 'f-1', judgment: null, colorCode: null };
      const updated = { ...existing, judgment: 'FAVORS_INTERVENTION', colorCode: '#22c55e' };
      mockPrismaService.etdJudgment.findUnique.mockResolvedValue(existing);
      mockPrismaService.etdJudgment.update.mockResolvedValue(updated);

      const result = await service.updateJudgment('j-1', {
        judgment: 'FAVORS_INTERVENTION',
        colorCode: '#22c55e',
      });

      expect(mockPrismaService.etdJudgment.update).toHaveBeenCalledWith({
        where: { id: 'j-1' },
        data: { judgment: 'FAVORS_INTERVENTION', colorCode: '#22c55e' },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteJudgment', () => {
    it('should throw NotFoundException if judgment does not exist', async () => {
      mockPrismaService.etdJudgment.findUnique.mockResolvedValue(null);
      await expect(service.deleteJudgment('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should delete the judgment', async () => {
      const existing = { id: 'j-1' };
      mockPrismaService.etdJudgment.findUnique.mockResolvedValue(existing);
      mockPrismaService.etdJudgment.delete.mockResolvedValue(existing);

      const result = await service.deleteJudgment('j-1');
      expect(mockPrismaService.etdJudgment.delete).toHaveBeenCalledWith({ where: { id: 'j-1' } });
      expect(result).toEqual(existing);
    });
  });
});
