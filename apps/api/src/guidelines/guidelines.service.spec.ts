import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GuidelinesService } from './guidelines.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  guideline: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  section: { create: jest.fn() },
  reference: { create: jest.fn(), findMany: jest.fn() },
  recommendation: { create: jest.fn() },
  etdFactor: { create: jest.fn() },
  etdJudgment: { create: jest.fn() },
  pico: { create: jest.fn() },
  picoCode: { create: jest.fn() },
  practicalIssue: { create: jest.fn() },
  outcome: { create: jest.fn() },
  outcomeReference: { create: jest.fn() },
  sectionReference: { create: jest.fn() },
  sectionPico: { create: jest.fn() },
  sectionRecommendation: { create: jest.fn() },
  picoRecommendation: { create: jest.fn() },
  guidelinePermission: { create: jest.fn() },
  $transaction: jest.fn(),
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

  describe('clone', () => {
    const sourceGuideline = {
      id: 'src-guid-1',
      title: 'My Guideline',
      shortName: 'my-guideline',
      description: 'A description',
      disclaimer: null,
      funding: null,
      contactName: null,
      contactEmail: null,
      language: 'en',
      guidelineType: 'ORGANIZATIONAL',
      organizationId: 'org-1',
      etdMode: 'SEVEN_FACTOR',
      showSectionNumbers: true,
      showCertaintyInLabel: false,
      showGradeDescription: true,
      trackChangesDefault: false,
      enableSubscriptions: false,
      enablePublicComments: false,
      showSectionTextPreview: true,
      pdfColumnLayout: 1,
      picoDisplayMode: 'INLINE',
      coverPageUrl: null,
      isPublic: false,
      isDeleted: false,
      fhirMeta: {},
      sections: [],
      references: [],
      recommendations: [],
      picos: [],
    };

    const clonedGuideline = {
      id: 'clone-guid-1',
      title: 'COPY OF My Guideline',
      shortName: 'my-guideline-copy',
      status: 'DRAFT',
    };

    beforeEach(() => {
      // $transaction executes the callback immediately with the mock tx (same mock object)
      mockPrismaService.$transaction.mockImplementation((cb: (tx: any) => Promise<any>) =>
        cb(mockPrismaService),
      );
      mockPrismaService.guideline.findUnique.mockResolvedValue(sourceGuideline);
      // shortName 'my-guideline-copy' is free
      mockPrismaService.guideline.findFirst.mockResolvedValue(null);
      mockPrismaService.guideline.create.mockResolvedValue(clonedGuideline);
      mockPrismaService.guidelinePermission.create.mockResolvedValue({});
    });

    it('should clone a guideline with "COPY OF " prefix in the title', async () => {
      const result = await service.clone('src-guid-1', 'user-42');

      expect(result).toEqual(clonedGuideline);
      expect(mockPrismaService.guideline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'COPY OF My Guideline' }),
        }),
      );
    });

    it('should set status to DRAFT on the cloned guideline', async () => {
      await service.clone('src-guid-1', 'user-42');

      const createCall = mockPrismaService.guideline.create.mock.calls[0][0];
      // status is not set explicitly (relies on DB default DRAFT); ensure it is not overridden
      expect(createCall.data.status).toBeUndefined();
    });

    it('should generate a unique shortName with "-copy" suffix', async () => {
      await service.clone('src-guid-1', 'user-42');

      expect(mockPrismaService.guideline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ shortName: 'my-guideline-copy' }),
        }),
      );
    });

    it('should increment the suffix when "-copy" shortName is already taken', async () => {
      // First findFirst call (for 'my-guideline-copy') returns taken; second (for '-copy-2') is free
      mockPrismaService.guideline.findFirst
        .mockResolvedValueOnce({ id: 'taken' })
        .mockResolvedValueOnce(null);

      await service.clone('src-guid-1', 'user-42');

      expect(mockPrismaService.guideline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ shortName: 'my-guideline-copy-2' }),
        }),
      );
    });

    it('should grant the cloning user ADMIN permission on the new guideline', async () => {
      await service.clone('src-guid-1', 'user-42');

      expect(mockPrismaService.guidelinePermission.create).toHaveBeenCalledWith({
        data: { guidelineId: clonedGuideline.id, userId: 'user-42', role: 'ADMIN' },
      });
    });

    it('should throw NotFoundException when source guideline does not exist', async () => {
      mockPrismaService.guideline.findUnique.mockResolvedValue(null);

      await expect(service.clone('nonexistent-id', 'user-42')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when source guideline is soft-deleted', async () => {
      mockPrismaService.guideline.findUnique.mockResolvedValue({
        ...sourceGuideline,
        isDeleted: true,
      });

      await expect(service.clone('src-guid-1', 'user-42')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the new guideline record', async () => {
      const result = await service.clone('src-guid-1', 'user-42');

      expect(result).toBe(clonedGuideline);
    });
  });

  describe('findReferenceDuplicates', () => {
    const makeRef = (overrides: Partial<{ id: string; title: string; authors: string | null; year: number | null; doi: string | null; pubmedId: string | null }>) => ({
      id: 'ref-default',
      title: 'Default Title',
      authors: null,
      year: null,
      doi: null,
      pubmedId: null,
      ...overrides,
    });

    it('should detect two references with the same DOI as DUPLICATE_DOI', async () => {
      const refs = [
        makeRef({ id: 'ref-1', title: 'Study A', doi: '10.1000/xyz123' }),
        makeRef({ id: 'ref-2', title: 'Study B', doi: '10.1000/xyz123' }),
      ];
      mockPrismaService.reference.findMany = jest.fn().mockResolvedValue(refs);

      const result = await service.findReferenceDuplicates('guideline-1');

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].reason).toBe('DUPLICATE_DOI');
      expect(result.groups[0].references).toHaveLength(2);
    });

    it('should detect two references with the same PMID as DUPLICATE_PMID', async () => {
      const refs = [
        makeRef({ id: 'ref-1', title: 'Study A', pubmedId: '12345678' }),
        makeRef({ id: 'ref-2', title: 'Study B', pubmedId: '12345678' }),
      ];
      mockPrismaService.reference.findMany = jest.fn().mockResolvedValue(refs);

      const result = await service.findReferenceDuplicates('guideline-1');

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].reason).toBe('DUPLICATE_PMID');
      expect(result.groups[0].references).toHaveLength(2);
    });

    it('should detect two references with identical titles as SIMILAR_TITLE with similarity 1', async () => {
      const refs = [
        makeRef({ id: 'ref-1', title: 'Effect of aspirin on cardiovascular disease' }),
        makeRef({ id: 'ref-2', title: 'Effect of aspirin on cardiovascular disease' }),
      ];
      mockPrismaService.reference.findMany = jest.fn().mockResolvedValue(refs);

      const result = await service.findReferenceDuplicates('guideline-1');

      const titleGroup = result.groups.find((g) => g.reason === 'SIMILAR_TITLE');
      expect(titleGroup).toBeDefined();
      expect((titleGroup as any).similarity).toBe(1);
    });

    it('should not group two references with 0% title word overlap', async () => {
      const refs = [
        makeRef({ id: 'ref-1', title: 'Aspirin cardiovascular prevention' }),
        makeRef({ id: 'ref-2', title: 'Zinc supplementation childhood diarrhea' }),
      ];
      mockPrismaService.reference.findMany = jest.fn().mockResolvedValue(refs);

      const result = await service.findReferenceDuplicates('guideline-1');

      const titleGroups = result.groups.filter((g) => g.reason === 'SIMILAR_TITLE');
      expect(titleGroups).toHaveLength(0);
    });

    it('should return empty groups for a guideline with no references', async () => {
      mockPrismaService.reference.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.findReferenceDuplicates('guideline-empty');

      expect(result.groups).toHaveLength(0);
    });
  });
});
