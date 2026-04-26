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

  describe('computeCertainty', () => {
    const NS = 'NOT_SERIOUS' as const;
    const S = 'SERIOUS' as const;
    const VS = 'VERY_SERIOUS' as const;
    const NONE = 'NONE' as const;
    const PRESENT = 'PRESENT' as const;
    const LARGE = 'LARGE' as const;
    const VERY_LARGE = 'VERY_LARGE' as const;

    it('all NOT_SERIOUS/NONE → HIGH', () => {
      expect(OutcomesService.computeCertainty({
        riskOfBias: NS, inconsistency: NS, indirectness: NS,
        imprecision: NS, publicationBias: NS,
        largeEffect: NONE, doseResponse: NONE, plausibleConfounding: NONE,
      })).toBe('HIGH');
    });

    it('all omitted (undefined) → HIGH', () => {
      expect(OutcomesService.computeCertainty({})).toBe('HIGH');
    });

    it('one SERIOUS → MODERATE', () => {
      expect(OutcomesService.computeCertainty({ riskOfBias: S })).toBe('MODERATE');
    });

    it('two SERIOUS → LOW', () => {
      expect(OutcomesService.computeCertainty({
        riskOfBias: S, inconsistency: S,
      })).toBe('LOW');
    });

    it('one VERY_SERIOUS → LOW', () => {
      expect(OutcomesService.computeCertainty({ riskOfBias: VS })).toBe('LOW');
    });

    it('SERIOUS + VERY_SERIOUS → VERY_LOW', () => {
      expect(OutcomesService.computeCertainty({
        riskOfBias: S, inconsistency: VS,
      })).toBe('VERY_LOW');
    });

    it('all five SERIOUS → VERY_LOW (clamped, not negative)', () => {
      expect(OutcomesService.computeCertainty({
        riskOfBias: S, inconsistency: S, indirectness: S,
        imprecision: S, publicationBias: S,
      })).toBe('VERY_LOW');
    });

    it('LARGE upgrade offsetting one SERIOUS → back to HIGH', () => {
      expect(OutcomesService.computeCertainty({
        riskOfBias: S, largeEffect: LARGE,
      })).toBe('HIGH');
    });

    it('VERY_LARGE upgrade offsetting two downgrades → HIGH', () => {
      expect(OutcomesService.computeCertainty({
        riskOfBias: S, inconsistency: S, largeEffect: VERY_LARGE,
      })).toBe('HIGH');
    });

    it('mixed downgrade + upgrade: SERIOUS + PRESENT doseResponse → HIGH', () => {
      expect(OutcomesService.computeCertainty({
        riskOfBias: S, doseResponse: PRESENT,
      })).toBe('HIGH');
    });

    it('PRESENT plausibleConfounding upgrades by 1', () => {
      expect(OutcomesService.computeCertainty({
        riskOfBias: S, plausibleConfounding: PRESENT,
      })).toBe('HIGH');
    });

    it('three upgrades clamped to HIGH', () => {
      expect(OutcomesService.computeCertainty({
        largeEffect: VERY_LARGE, doseResponse: PRESENT, plausibleConfounding: PRESENT,
      })).toBe('HIGH');
    });
  });

  describe('update() GRADE recalculation', () => {
    it('recalculates certaintyOverall when riskOfBias changes', async () => {
      const existing = {
        id: 'uuid-1',
        title: 'Mortality',
        riskOfBias: 'NOT_SERIOUS',
        inconsistency: 'NOT_SERIOUS',
        indirectness: 'NOT_SERIOUS',
        imprecision: 'NOT_SERIOUS',
        publicationBias: 'NOT_SERIOUS',
        largeEffect: 'NONE',
        doseResponse: 'NONE',
        plausibleConfounding: 'NONE',
        certaintyOverall: 'HIGH',
        referenceLinks: [],
        shadows: [],
      };
      mockPrismaService.outcome.findUnique.mockResolvedValue(existing);
      mockPrismaService.outcome.update.mockResolvedValue({
        ...existing,
        riskOfBias: 'SERIOUS',
        certaintyOverall: 'MODERATE',
      });

      await service.update('uuid-1', { riskOfBias: 'SERIOUS' as any });

      expect(mockPrismaService.outcome.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: expect.objectContaining({ certaintyOverall: 'MODERATE' }),
      });
    });

    it('does not touch certaintyOverall when no GRADE factor in DTO', async () => {
      const existing = {
        id: 'uuid-1',
        title: 'Mortality',
        certaintyOverall: 'HIGH',
        referenceLinks: [],
        shadows: [],
      };
      mockPrismaService.outcome.findUnique.mockResolvedValue(existing);
      mockPrismaService.outcome.update.mockResolvedValue({
        ...existing,
        title: 'Updated',
      });

      await service.update('uuid-1', { title: 'Updated' });

      const callData = mockPrismaService.outcome.update.mock.calls[0][0].data;
      expect(callData.certaintyOverall).toBeUndefined();
    });

    it('allows explicit certaintyOverall through when no GRADE factor in DTO', async () => {
      const existing = {
        id: 'uuid-1',
        title: 'Mortality',
        certaintyOverall: 'HIGH',
        referenceLinks: [],
        shadows: [],
      };
      mockPrismaService.outcome.findUnique.mockResolvedValue(existing);
      mockPrismaService.outcome.update.mockResolvedValue({
        ...existing,
        certaintyOverall: 'LOW',
      });

      await service.update('uuid-1', { certaintyOverall: 'LOW' as any });

      expect(mockPrismaService.outcome.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: expect.objectContaining({ certaintyOverall: 'LOW' }),
      });
    });
  });

  describe('create() auto-calculates certaintyOverall', () => {
    it('ignores DTO certaintyOverall and computes from factors', async () => {
      const dto = {
        picoId: 'pico-uuid',
        title: 'Mortality',
        outcomeType: 'DICHOTOMOUS' as any,
        riskOfBias: 'SERIOUS' as any,
        certaintyOverall: 'HIGH' as any, // should be overridden
      };
      const expected = { id: 'uuid-1', ...dto, certaintyOverall: 'MODERATE' };
      mockPrismaService.outcome.create.mockResolvedValue(expected);

      await service.create(dto);

      expect(mockPrismaService.outcome.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ certaintyOverall: 'MODERATE' }),
      });
    });

    it('defaults to HIGH when no factors provided', async () => {
      const dto = {
        picoId: 'pico-uuid',
        title: 'Mortality',
        outcomeType: 'DICHOTOMOUS' as any,
      };
      mockPrismaService.outcome.create.mockResolvedValue({ id: 'uuid-1', ...dto });

      await service.create(dto);

      expect(mockPrismaService.outcome.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ certaintyOverall: 'HIGH' }),
      });
    });
  });
});
