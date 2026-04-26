import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from './tags.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  tag: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  recommendationTag: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TagsService', () => {
  let service: TagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a tag with name and color', async () => {
      const guidelineId = 'guideline-uuid';
      const dto = { name: 'Priority', color: '#3B82F6' };
      const created = { id: 'tag-uuid', guidelineId, ...dto };
      mockPrisma.tag.create.mockResolvedValue(created);

      const result = await service.create(guidelineId, dto);

      expect(mockPrisma.tag.create).toHaveBeenCalledWith({
        data: { guidelineId, name: dto.name, color: dto.color },
      });
      expect(result).toEqual(created);
    });

    it('creates a tag with no color (null)', async () => {
      const guidelineId = 'guideline-uuid';
      const dto = { name: 'Urgent' };
      const created = { id: 'tag-uuid', guidelineId, name: 'Urgent', color: null };
      mockPrisma.tag.create.mockResolvedValue(created);

      await service.create(guidelineId, dto);

      expect(mockPrisma.tag.create).toHaveBeenCalledWith({
        data: { guidelineId, name: 'Urgent', color: null },
      });
    });
  });

  // ── findByGuideline ───────────────────────────────────────────────────────

  describe('findByGuideline', () => {
    it('returns tags ordered by name ascending', async () => {
      const guidelineId = 'guideline-uuid';
      const tags = [
        { id: 'tag-1', guidelineId, name: 'Alpha', color: null },
        { id: 'tag-2', guidelineId, name: 'Beta', color: '#FF0000' },
      ];
      mockPrisma.tag.findMany.mockResolvedValue(tags);

      const result = await service.findByGuideline(guidelineId);

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
        where: { guidelineId },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(tags);
    });

    it('returns empty array when guideline has no tags', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([]);

      const result = await service.findByGuideline('empty-guideline-uuid');

      expect(result).toEqual([]);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates name and color of an existing tag', async () => {
      const guidelineId = 'guideline-uuid';
      const tagId = 'tag-uuid';
      const existing = { id: tagId, guidelineId, name: 'Old Name', color: null };
      const updated = { id: tagId, guidelineId, name: 'New Name', color: '#AABBCC' };

      mockPrisma.tag.findUnique.mockResolvedValue(existing);
      mockPrisma.tag.update.mockResolvedValue(updated);

      const result = await service.update(guidelineId, tagId, {
        name: 'New Name',
        color: '#AABBCC',
      });

      expect(mockPrisma.tag.update).toHaveBeenCalledWith({
        where: { id: tagId },
        data: { name: 'New Name', color: '#AABBCC' },
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when tag does not belong to guideline', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue({
        id: 'tag-uuid',
        guidelineId: 'other-guideline',
        name: 'Tag',
      });

      await expect(
        service.update('guideline-uuid', 'tag-uuid', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when tag does not exist', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(
        service.update('guideline-uuid', 'missing-tag', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes an existing tag', async () => {
      const guidelineId = 'guideline-uuid';
      const tagId = 'tag-uuid';
      const existing = { id: tagId, guidelineId, name: 'Tag', color: null };

      mockPrisma.tag.findUnique.mockResolvedValue(existing);
      mockPrisma.tag.delete.mockResolvedValue(existing);

      const result = await service.remove(guidelineId, tagId);

      expect(mockPrisma.tag.delete).toHaveBeenCalledWith({ where: { id: tagId } });
      expect(result).toEqual(existing);
    });

    it('throws NotFoundException when tag not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('guideline-uuid', 'missing-tag'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── addTagToRecommendation ────────────────────────────────────────────────

  describe('addTagToRecommendation', () => {
    it('adds a tag to a recommendation successfully', async () => {
      const recommendationId = 'rec-uuid';
      const tagId = 'tag-uuid';
      const created = { recommendationId, tagId };

      mockPrisma.recommendationTag.findUnique.mockResolvedValue(null);
      mockPrisma.recommendationTag.create.mockResolvedValue(created);

      const result = await service.addTagToRecommendation(recommendationId, tagId);

      expect(mockPrisma.recommendationTag.create).toHaveBeenCalledWith({
        data: { recommendationId, tagId },
      });
      expect(result).toEqual(created);
    });

    it('throws ConflictException when tag is already assigned', async () => {
      mockPrisma.recommendationTag.findUnique.mockResolvedValue({
        recommendationId: 'rec-uuid',
        tagId: 'tag-uuid',
      });

      await expect(
        service.addTagToRecommendation('rec-uuid', 'tag-uuid'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── removeTagFromRecommendation ───────────────────────────────────────────

  describe('removeTagFromRecommendation', () => {
    it('removes an assigned tag from a recommendation', async () => {
      const recommendationId = 'rec-uuid';
      const tagId = 'tag-uuid';
      const existing = { recommendationId, tagId };

      mockPrisma.recommendationTag.findUnique.mockResolvedValue(existing);
      mockPrisma.recommendationTag.delete.mockResolvedValue(existing);

      const result = await service.removeTagFromRecommendation(recommendationId, tagId);

      expect(mockPrisma.recommendationTag.delete).toHaveBeenCalledWith({
        where: { recommendationId_tagId: { recommendationId, tagId } },
      });
      expect(result).toEqual(existing);
    });

    it('throws NotFoundException when tag is not assigned to recommendation', async () => {
      mockPrisma.recommendationTag.findUnique.mockResolvedValue(null);

      await expect(
        service.removeTagFromRecommendation('rec-uuid', 'tag-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
