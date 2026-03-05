import { Test, TestingModule } from '@nestjs/testing';
import { LinksService } from './links.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  sectionReference: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  sectionPico: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  sectionRecommendation: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  picoRecommendation: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  outcomeReference: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('LinksService', () => {
  let service: LinksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── SectionReference ─────────────────────────────────────

  describe('linkSectionReference', () => {
    it('should upsert a section-reference link', async () => {
      const dto = { sectionId: 's1', referenceId: 'r1', ordering: 1 };
      const expected = { sectionId: 's1', referenceId: 'r1', ordering: 1 };
      mockPrismaService.sectionReference.upsert.mockResolvedValue(expected);

      const result = await service.linkSectionReference(dto);
      expect(result).toEqual(expected);
      expect(mockPrismaService.sectionReference.upsert).toHaveBeenCalledWith({
        where: { sectionId_referenceId: { sectionId: 's1', referenceId: 'r1' } },
        create: { sectionId: 's1', referenceId: 'r1', ordering: 1 },
        update: { ordering: 1 },
      });
    });
  });

  describe('unlinkSectionReference', () => {
    it('should delete the section-reference link', async () => {
      mockPrismaService.sectionReference.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unlinkSectionReference('s1', 'r1');
      expect(result).toEqual({ count: 1 });
      expect(mockPrismaService.sectionReference.deleteMany).toHaveBeenCalledWith({
        where: { sectionId: 's1', referenceId: 'r1' },
      });
    });
  });

  describe('listSectionReferences', () => {
    it('should return references for a section', async () => {
      const items = [{ sectionId: 's1', referenceId: 'r1', reference: {} }];
      mockPrismaService.sectionReference.findMany.mockResolvedValue(items);

      const result = await service.listSectionReferences('s1');
      expect(result).toEqual(items);
      expect(mockPrismaService.sectionReference.findMany).toHaveBeenCalledWith({
        where: { sectionId: 's1' },
        orderBy: { ordering: 'asc' },
        include: { reference: true },
      });
    });
  });

  // ── SectionPico ──────────────────────────────────────────

  describe('linkSectionPico', () => {
    it('should upsert a section-pico link', async () => {
      const dto = { sectionId: 's1', picoId: 'p1', ordering: 2 };
      const expected = { sectionId: 's1', picoId: 'p1', ordering: 2 };
      mockPrismaService.sectionPico.upsert.mockResolvedValue(expected);

      const result = await service.linkSectionPico(dto);
      expect(result).toEqual(expected);
      expect(mockPrismaService.sectionPico.upsert).toHaveBeenCalledWith({
        where: { sectionId_picoId: { sectionId: 's1', picoId: 'p1' } },
        create: { sectionId: 's1', picoId: 'p1', ordering: 2 },
        update: { ordering: 2 },
      });
    });
  });

  describe('unlinkSectionPico', () => {
    it('should delete the section-pico link', async () => {
      mockPrismaService.sectionPico.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unlinkSectionPico('s1', 'p1');
      expect(result).toEqual({ count: 1 });
      expect(mockPrismaService.sectionPico.deleteMany).toHaveBeenCalledWith({
        where: { sectionId: 's1', picoId: 'p1' },
      });
    });
  });

  describe('listSectionPicos', () => {
    it('should return picos for a section', async () => {
      const items = [{ sectionId: 's1', picoId: 'p1', pico: {} }];
      mockPrismaService.sectionPico.findMany.mockResolvedValue(items);

      const result = await service.listSectionPicos('s1');
      expect(result).toEqual(items);
      expect(mockPrismaService.sectionPico.findMany).toHaveBeenCalledWith({
        where: { sectionId: 's1' },
        orderBy: { ordering: 'asc' },
        include: { pico: true },
      });
    });
  });

  // ── SectionRecommendation ────────────────────────────────

  describe('linkSectionRecommendation', () => {
    it('should upsert a section-recommendation link', async () => {
      const dto = { sectionId: 's1', recommendationId: 'rec1', ordering: 3 };
      const expected = { sectionId: 's1', recommendationId: 'rec1', ordering: 3 };
      mockPrismaService.sectionRecommendation.upsert.mockResolvedValue(expected);

      const result = await service.linkSectionRecommendation(dto);
      expect(result).toEqual(expected);
      expect(mockPrismaService.sectionRecommendation.upsert).toHaveBeenCalledWith({
        where: { sectionId_recommendationId: { sectionId: 's1', recommendationId: 'rec1' } },
        create: { sectionId: 's1', recommendationId: 'rec1', ordering: 3 },
        update: { ordering: 3 },
      });
    });
  });

  describe('unlinkSectionRecommendation', () => {
    it('should delete the section-recommendation link', async () => {
      mockPrismaService.sectionRecommendation.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unlinkSectionRecommendation('s1', 'rec1');
      expect(result).toEqual({ count: 1 });
      expect(mockPrismaService.sectionRecommendation.deleteMany).toHaveBeenCalledWith({
        where: { sectionId: 's1', recommendationId: 'rec1' },
      });
    });
  });

  describe('listSectionRecommendations', () => {
    it('should return recommendations for a section', async () => {
      const items = [{ sectionId: 's1', recommendationId: 'rec1', recommendation: {} }];
      mockPrismaService.sectionRecommendation.findMany.mockResolvedValue(items);

      const result = await service.listSectionRecommendations('s1');
      expect(result).toEqual(items);
      expect(mockPrismaService.sectionRecommendation.findMany).toHaveBeenCalledWith({
        where: { sectionId: 's1' },
        orderBy: { ordering: 'asc' },
        include: { recommendation: true },
      });
    });
  });

  // ── PicoRecommendation ───────────────────────────────────

  describe('linkPicoRecommendation', () => {
    it('should upsert a pico-recommendation link', async () => {
      const dto = { picoId: 'p1', recommendationId: 'rec1' };
      const expected = { picoId: 'p1', recommendationId: 'rec1' };
      mockPrismaService.picoRecommendation.upsert.mockResolvedValue(expected);

      const result = await service.linkPicoRecommendation(dto);
      expect(result).toEqual(expected);
      expect(mockPrismaService.picoRecommendation.upsert).toHaveBeenCalledWith({
        where: { picoId_recommendationId: { picoId: 'p1', recommendationId: 'rec1' } },
        create: { picoId: 'p1', recommendationId: 'rec1' },
        update: {},
      });
    });
  });

  describe('unlinkPicoRecommendation', () => {
    it('should delete the pico-recommendation link', async () => {
      mockPrismaService.picoRecommendation.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unlinkPicoRecommendation('p1', 'rec1');
      expect(result).toEqual({ count: 1 });
      expect(mockPrismaService.picoRecommendation.deleteMany).toHaveBeenCalledWith({
        where: { picoId: 'p1', recommendationId: 'rec1' },
      });
    });
  });

  describe('listPicoRecommendations', () => {
    it('should return recommendations for a pico', async () => {
      const items = [{ picoId: 'p1', recommendationId: 'rec1', recommendation: {} }];
      mockPrismaService.picoRecommendation.findMany.mockResolvedValue(items);

      const result = await service.listPicoRecommendations('p1');
      expect(result).toEqual(items);
      expect(mockPrismaService.picoRecommendation.findMany).toHaveBeenCalledWith({
        where: { picoId: 'p1' },
        include: { recommendation: true },
      });
    });
  });

  // ── OutcomeReference ─────────────────────────────────────

  describe('linkOutcomeReference', () => {
    it('should upsert an outcome-reference link', async () => {
      const dto = { outcomeId: 'o1', referenceId: 'r1' };
      const expected = { outcomeId: 'o1', referenceId: 'r1' };
      mockPrismaService.outcomeReference.upsert.mockResolvedValue(expected);

      const result = await service.linkOutcomeReference(dto);
      expect(result).toEqual(expected);
      expect(mockPrismaService.outcomeReference.upsert).toHaveBeenCalledWith({
        where: { outcomeId_referenceId: { outcomeId: 'o1', referenceId: 'r1' } },
        create: { outcomeId: 'o1', referenceId: 'r1' },
        update: {},
      });
    });
  });

  describe('unlinkOutcomeReference', () => {
    it('should delete the outcome-reference link', async () => {
      mockPrismaService.outcomeReference.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unlinkOutcomeReference('o1', 'r1');
      expect(result).toEqual({ count: 1 });
      expect(mockPrismaService.outcomeReference.deleteMany).toHaveBeenCalledWith({
        where: { outcomeId: 'o1', referenceId: 'r1' },
      });
    });
  });

  describe('listOutcomeReferences', () => {
    it('should return references for an outcome', async () => {
      const items = [{ outcomeId: 'o1', referenceId: 'r1', reference: {} }];
      mockPrismaService.outcomeReference.findMany.mockResolvedValue(items);

      const result = await service.listOutcomeReferences('o1');
      expect(result).toEqual(items);
      expect(mockPrismaService.outcomeReference.findMany).toHaveBeenCalledWith({
        where: { outcomeId: 'o1' },
        include: { reference: true },
      });
    });
  });
});
