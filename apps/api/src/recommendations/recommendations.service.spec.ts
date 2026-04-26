import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReorderRecommendationsDto } from './dto/reorder-recommendations.dto';

const mockPrismaService = {
  recommendation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  emrElement: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDecisionAid', () => {
    const recId = 'rec-uuid-1';

    it('should throw NotFoundException when recommendation does not exist', async () => {
      mockPrismaService.recommendation.findUnique.mockResolvedValue(null);
      await expect(service.getDecisionAid(recId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when recommendation is soft-deleted', async () => {
      mockPrismaService.recommendation.findUnique.mockResolvedValue({
        id: recId,
        isDeleted: true,
        picoLinks: [],
      });
      await expect(service.getDecisionAid(recId)).rejects.toThrow(NotFoundException);
    });

    it('should return recommendation overview and linked picos with outcomes', async () => {
      const mockOutcome = {
        id: 'out-1',
        title: 'All-cause mortality',
        outcomeType: 'DICHOTOMOUS',
        certaintyOverall: 'MODERATE',
        baselineRisk: 0.05,
        absoluteEffectIntervention: 0.03,
        absoluteEffectComparison: 0.05,
        relativeEffect: 0.6,
        isDeleted: false,
        isShadow: false,
      };
      const mockPico = {
        id: 'pico-1',
        population: 'Adults with HF',
        intervention: 'ACE inhibitors',
        comparator: 'Placebo',
        narrativeSummary: null,
        outcomes: [mockOutcome],
        practicalIssues: [],
      };
      const mockRec = {
        id: recId,
        title: 'Use ACE inhibitors',
        description: {},
        strength: 'STRONG_FOR',
        recommendationType: 'GRADE',
        remark: null,
        rationale: null,
        practicalInfo: null,
        certaintyOfEvidence: 'MODERATE',
        isDeleted: false,
        picoLinks: [{ pico: mockPico }],
      };

      mockPrismaService.recommendation.findUnique.mockResolvedValue(mockRec);

      const result = await service.getDecisionAid(recId);

      expect(result.recommendation.id).toBe(recId);
      expect(result.recommendation.strength).toBe('STRONG_FOR');
      expect(result.recommendation.certaintyOfEvidence).toBe('MODERATE');
      expect(result.picos).toHaveLength(1);
      expect(result.picos[0].id).toBe('pico-1');
      expect(result.picos[0].outcomes).toHaveLength(1);
      expect(result.picos[0].outcomes[0].title).toBe('All-cause mortality');
    });

    it('should return empty picos array when no PICOs are linked', async () => {
      mockPrismaService.recommendation.findUnique.mockResolvedValue({
        id: recId,
        title: 'Standalone recommendation',
        description: {},
        strength: 'NOT_SET',
        recommendationType: 'PRACTICE_STATEMENT',
        remark: null,
        rationale: null,
        practicalInfo: null,
        certaintyOfEvidence: null,
        isDeleted: false,
        picoLinks: [],
      });

      const result = await service.getDecisionAid(recId);

      expect(result.recommendation.id).toBe(recId);
      expect(result.picos).toHaveLength(0);
    });

    it('should query with correct include structure for picos and outcomes', async () => {
      mockPrismaService.recommendation.findUnique.mockResolvedValue({
        id: recId,
        isDeleted: false,
        picoLinks: [],
        title: null,
        description: {},
        strength: 'NOT_SET',
        recommendationType: 'GRADE',
        remark: null,
        rationale: null,
        practicalInfo: null,
        certaintyOfEvidence: null,
      });

      await service.getDecisionAid(recId);

      expect(mockPrismaService.recommendation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: recId },
          include: expect.objectContaining({
            picoLinks: expect.objectContaining({
              include: expect.objectContaining({
                pico: expect.objectContaining({
                  include: expect.objectContaining({ outcomes: expect.any(Object) }),
                }),
              }),
            }),
          }),
        }),
      );
    });

    it('should filter deleted and shadow outcomes via the query where clause', async () => {
      mockPrismaService.recommendation.findUnique.mockResolvedValue({
        id: recId,
        isDeleted: false,
        picoLinks: [
          {
            pico: {
              id: 'pico-1',
              population: 'Adults',
              intervention: 'Drug A',
              comparator: 'Placebo',
              narrativeSummary: null,
              // Prisma applies the where filter; service returns only non-deleted non-shadow outcomes
              outcomes: [
                { id: 'out-active', title: 'Active outcome', isDeleted: false, isShadow: false },
              ],
              practicalIssues: [],
            },
          },
        ],
        title: null,
        description: {},
        strength: 'NOT_SET',
        recommendationType: 'GRADE',
        remark: null,
        rationale: null,
        practicalInfo: null,
        certaintyOfEvidence: null,
      });

      const result = await service.getDecisionAid(recId);

      // Prisma filters are set in the include; verify only the active outcome comes back
      expect(result.picos[0].outcomes).toHaveLength(1);
      expect(result.picos[0].outcomes[0].id).toBe('out-active');

      // Verify the outcomes include clause uses the correct where filter
      const call = mockPrismaService.recommendation.findUnique.mock.calls[0][0];
      const outcomesWhere = call.include.picoLinks.include.pico.include.outcomes.where;
      expect(outcomesWhere).toEqual({ isDeleted: false, isShadow: false });
    });
  });

  describe('reorder', () => {
    it('should call prisma.$transaction with one update per recommendation', async () => {
      const dto: ReorderRecommendationsDto = {
        recommendations: [
          { id: 'rec-uuid-1', ordering: 0 },
          { id: 'rec-uuid-2', ordering: 1 },
        ],
      };
      const mockUpdated = [{ id: 'rec-uuid-1', ordering: 0 }, { id: 'rec-uuid-2', ordering: 1 }];
      mockPrismaService.$transaction.mockResolvedValue(mockUpdated);
      // recommendation.update returns a promise stub for each item
      mockPrismaService.recommendation.update.mockResolvedValue({});

      await service.reorder(dto);

      expect(mockPrismaService.recommendation.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.recommendation.update).toHaveBeenCalledWith({
        where: { id: 'rec-uuid-1' },
        data: { ordering: 0 },
      });
      expect(mockPrismaService.recommendation.update).toHaveBeenCalledWith({
        where: { id: 'rec-uuid-2' },
        data: { ordering: 1 },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should return the array of updated recommendations from the transaction', async () => {
      const dto: ReorderRecommendationsDto = {
        recommendations: [{ id: 'rec-uuid-1', ordering: 5 }],
      };
      const mockResult = [{ id: 'rec-uuid-1', ordering: 5 }];
      mockPrismaService.$transaction.mockResolvedValue(mockResult);
      mockPrismaService.recommendation.update.mockResolvedValue({});

      const result = await service.reorder(dto);

      expect(result).toEqual(mockResult);
    });

    it('should call $transaction with an empty array when recommendations list is empty', async () => {
      const dto: ReorderRecommendationsDto = { recommendations: [] };
      mockPrismaService.$transaction.mockResolvedValue([]);

      const result = await service.reorder(dto);

      expect(mockPrismaService.recommendation.update).not.toHaveBeenCalled();
      expect(mockPrismaService.$transaction).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });
});
