import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { SectionsService } from './sections.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  section: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('SectionsService', () => {
  let service: SectionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SectionsService>(SectionsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a level-1 section (no parentId)', async () => {
      const dto = { guidelineId: 'g-1', title: 'Top level', parentId: undefined };
      const expected = { id: 's-1', ...dto };
      mockPrismaService.section.create.mockResolvedValue(expected);

      const result = await service.create(dto as any);

      expect(result).toEqual(expected);
      expect(mockPrismaService.section.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.section.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ guidelineId: 'g-1', title: 'Top level' }),
      });
    });

    it('should create a level-2 section (parentId with depth 1)', async () => {
      // parent has no parentId → depth 1
      mockPrismaService.section.findUnique.mockResolvedValueOnce({ parentId: null });
      const dto = { guidelineId: 'g-1', title: 'Sub-section', parentId: 'parent-1' };
      const expected = { id: 's-2', ...dto };
      mockPrismaService.section.create.mockResolvedValue(expected);

      const result = await service.create(dto as any);

      expect(result).toEqual(expected);
      expect(mockPrismaService.section.create).toHaveBeenCalled();
    });

    it('should create a level-3 section (parentId with depth 2)', async () => {
      // parent has a grandparent, grandparent has no parentId → parent depth 2
      mockPrismaService.section.findUnique
        .mockResolvedValueOnce({ parentId: 'grandparent-1' }) // parent lookup
        .mockResolvedValueOnce({ parentId: null });            // grandparent lookup
      const dto = { guidelineId: 'g-1', title: 'Sub-sub-section', parentId: 'parent-2' };
      const expected = { id: 's-3', ...dto };
      mockPrismaService.section.create.mockResolvedValue(expected);

      const result = await service.create(dto as any);

      expect(result).toEqual(expected);
      expect(mockPrismaService.section.create).toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException when creating a level-4 section (parentId with depth 3)', async () => {
      // parent has grandparent, grandparent has great-grandparent, great-grandparent has no parent → parent depth 3
      mockPrismaService.section.findUnique
        .mockResolvedValueOnce({ parentId: 'grandparent-1' })       // parent lookup
        .mockResolvedValueOnce({ parentId: 'great-grandparent-1' }) // grandparent lookup
        .mockResolvedValueOnce({ parentId: null });                  // great-grandparent lookup
      const dto = { guidelineId: 'g-1', title: 'Too deep', parentId: 'parent-3' };

      await expect(service.create(dto as any)).rejects.toThrow(
        new UnprocessableEntityException('Section nesting cannot exceed 3 levels'),
      );
      expect(mockPrismaService.section.create).not.toHaveBeenCalled();
    });
  });
});
