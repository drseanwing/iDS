import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReferencesService } from './references.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const mockPrismaService = {
  reference: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  section: {
    findMany: jest.fn(),
  },
};

const mockStorageService = {
  upload: jest.fn(),
  download: jest.fn(),
  delete: jest.fn(),
};

describe('ReferencesService', () => {
  let service: ReferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferencesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<ReferencesService>(ReferencesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a reference with correct fields', async () => {
      const dto = {
        guidelineId: 'g-1',
        title: 'GRADE handbook',
        authors: 'Guyatt et al.',
        year: 2013,
        doi: '10.1234/grade',
        studyType: 'SYSTEMATIC_REVIEW',
      };
      const expected = { id: 'ref-1', ...dto };
      mockPrismaService.reference.create.mockResolvedValue(expected);

      const result = await service.create(dto as any);

      expect(result).toEqual(expected);
      expect(mockPrismaService.reference.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          guidelineId: 'g-1',
          title: 'GRADE handbook',
          authors: 'Guyatt et al.',
        }),
      });
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      // computeReferenceNumbers needs section data; return empty when called
      mockPrismaService.section.findMany.mockResolvedValue([]);
    });

    it('filters references by guidelineId', async () => {
      const refs = [{ id: 'ref-1', title: 'R1', sectionPlacements: [], outcomeLinks: [] }];
      mockPrismaService.reference.findMany.mockResolvedValue(refs);
      mockPrismaService.reference.count.mockResolvedValue(1);

      const result = await service.findAll({ guidelineId: 'g-1' });

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.reference.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ guidelineId: 'g-1', isDeleted: false }),
        }),
      );
    });

    it('applies search filter across title/authors/abstract', async () => {
      const refs = [{ id: 'ref-1', title: 'Matching ref', sectionPlacements: [], outcomeLinks: [] }];
      mockPrismaService.reference.findMany.mockResolvedValue(refs);
      mockPrismaService.reference.count.mockResolvedValue(1);

      await service.findAll({ search: 'GRADE' });

      const callArgs = mockPrismaService.reference.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: expect.objectContaining({ contains: 'GRADE' }) }),
          expect.objectContaining({ authors: expect.objectContaining({ contains: 'GRADE' }) }),
          expect.objectContaining({ abstract: expect.objectContaining({ contains: 'GRADE' }) }),
        ]),
      );
    });
  });

  describe('update', () => {
    it('patches fields on an existing reference', async () => {
      const existing = { id: 'ref-1', title: 'Old', sectionPlacements: [], outcomeLinks: [], attachments: [] };
      mockPrismaService.reference.findUnique.mockResolvedValue(existing);
      mockPrismaService.reference.update.mockResolvedValue({ ...existing, title: 'New' });

      const result = await service.update('ref-1', { title: 'New' } as any);

      expect(result.title).toBe('New');
      expect(mockPrismaService.reference.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ref-1' } }),
      );
    });

    it('throws NotFoundException for missing reference', async () => {
      mockPrismaService.reference.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('sets isDeleted=true on the reference', async () => {
      const existing = { id: 'ref-1', sectionPlacements: [], outcomeLinks: [], attachments: [] };
      mockPrismaService.reference.findUnique.mockResolvedValue(existing);
      mockPrismaService.reference.update.mockResolvedValue({ ...existing, isDeleted: true });

      const result = await service.softDelete('ref-1');

      expect(result.isDeleted).toBe(true);
      expect(mockPrismaService.reference.update).toHaveBeenCalledWith({
        where: { id: 'ref-1' },
        data: { isDeleted: true },
      });
    });

    it('throws BadRequestException when reference is in use', async () => {
      const inUse = {
        id: 'ref-1',
        sectionPlacements: [{ sectionId: 's-1' }],
        outcomeLinks: [],
        attachments: [],
      };
      mockPrismaService.reference.findUnique.mockResolvedValue(inUse);

      await expect(service.softDelete('ref-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('computeReferenceNumbers', () => {
    it('assigns numbers in section order (depth-first)', async () => {
      const sections = [
        {
          id: 's-1',
          parentId: null,
          ordering: 0,
          excludeFromNumbering: false,
          sectionReferences: [{ referenceId: 'ref-A', ordering: 0 }, { referenceId: 'ref-B', ordering: 1 }],
        },
        {
          id: 's-2',
          parentId: null,
          ordering: 1,
          excludeFromNumbering: false,
          sectionReferences: [{ referenceId: 'ref-C', ordering: 0 }],
        },
      ];
      mockPrismaService.section.findMany.mockResolvedValue(sections);

      const map = await service.computeReferenceNumbers('g-1');

      expect(map.get('ref-A')).toBe(1);
      expect(map.get('ref-B')).toBe(2);
      expect(map.get('ref-C')).toBe(3);
    });
  });
});
