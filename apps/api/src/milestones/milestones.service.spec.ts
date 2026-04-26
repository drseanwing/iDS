import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  milestone: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  checklistItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('MilestonesService', () => {
  let service: MilestonesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestonesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MilestonesService>(MilestonesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a milestone with correct fields', async () => {
      const dto = {
        guidelineId: 'g-1',
        title: 'Draft Complete',
        targetDate: '2024-06-01',
        responsiblePerson: 'Alice',
        ordering: 1,
      };
      const expected = { id: 'm-1', ...dto };
      mockPrismaService.milestone.create.mockResolvedValue(expected);

      const result = await service.create(dto, 'user-1');

      expect(result).toEqual(expected);
      expect(mockPrismaService.milestone.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          guidelineId: 'g-1',
          title: 'Draft Complete',
          responsiblePerson: 'Alice',
          ordering: 1,
        }),
      });
    });
  });

  describe('findByGuideline', () => {
    it('returns milestones and checklist items for a guideline', async () => {
      const milestones = [{ id: 'm-1', title: 'M1' }];
      const checklistItems = [{ id: 'ci-1', label: 'Item 1' }];
      mockPrismaService.milestone.findMany.mockResolvedValue(milestones);
      mockPrismaService.checklistItem.findMany.mockResolvedValue(checklistItems);

      const result = await service.findByGuideline('g-1');

      expect(result).toEqual({ milestones, checklistItems });
      expect(mockPrismaService.milestone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guidelineId: 'g-1' } }),
      );
    });
  });

  describe('update', () => {
    it('updates milestone fields', async () => {
      const existing = { id: 'm-1', title: 'Old' };
      mockPrismaService.milestone.findUnique.mockResolvedValue(existing);
      mockPrismaService.milestone.update.mockResolvedValue({ ...existing, title: 'New' });

      const result = await service.update('m-1', { title: 'New' });

      expect(result.title).toBe('New');
      expect(mockPrismaService.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'm-1' } }),
      );
    });

    it('throws NotFoundException when milestone does not exist', async () => {
      mockPrismaService.milestone.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the milestone', async () => {
      const existing = { id: 'm-1' };
      mockPrismaService.milestone.findUnique.mockResolvedValue(existing);
      mockPrismaService.milestone.delete.mockResolvedValue(existing);

      await service.remove('m-1');

      expect(mockPrismaService.milestone.delete).toHaveBeenCalledWith({ where: { id: 'm-1' } });
    });
  });

  describe('addChecklistItem', () => {
    it('creates a checklist item linked to a guideline', async () => {
      const dto = { guidelineId: 'g-1', category: 'REPORTING', label: 'Check 1', ordering: 0 };
      const expected = { id: 'ci-1', ...dto };
      mockPrismaService.checklistItem.create.mockResolvedValue(expected);

      const result = await service.addChecklistItem(dto);

      expect(result).toEqual(expected);
      expect(mockPrismaService.checklistItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ guidelineId: 'g-1', label: 'Check 1' }),
      });
    });
  });

  describe('toggleChecklistItem', () => {
    it('updates isChecked status to true', async () => {
      const existing = { id: 'ci-1', isChecked: false };
      mockPrismaService.checklistItem.findUnique.mockResolvedValue(existing);
      mockPrismaService.checklistItem.update.mockResolvedValue({ ...existing, isChecked: true });

      const result = await service.toggleChecklistItem('ci-1', true, 'user-1');

      expect(mockPrismaService.checklistItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isChecked: true, checkedBy: 'user-1' }),
        }),
      );
      expect(result.isChecked).toBe(true);
    });

    it('throws NotFoundException when checklist item does not exist', async () => {
      mockPrismaService.checklistItem.findUnique.mockResolvedValue(null);

      await expect(service.toggleChecklistItem('missing', true, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
