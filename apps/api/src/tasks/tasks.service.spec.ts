import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  task: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a Task with correct fields', async () => {
      const dto = {
        guidelineId: 'guide-1',
        title: 'Review section 2',
        description: 'Ensure accuracy',
        status: 'TODO',
        assigneeId: 'user-5',
      };
      const expected = {
        id: 'task-1',
        ...dto,
        createdBy: 'user-creator',
        assignee: { id: 'user-5', displayName: 'Bob' },
      };
      mockPrismaService.task.create.mockResolvedValue(expected);

      const result = await service.create(dto, 'user-creator');

      expect(result).toEqual(expected);
      expect(mockPrismaService.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          guidelineId: 'guide-1',
          title: 'Review section 2',
          description: 'Ensure accuracy',
          status: 'TODO',
          assigneeId: 'user-5',
          createdBy: 'user-creator',
        }),
        include: { assignee: true },
      });
    });

    it('should default status to TODO when not provided', async () => {
      const dto = { guidelineId: 'guide-1', title: 'Draft task' };
      mockPrismaService.task.create.mockResolvedValue({
        id: 'task-2',
        ...dto,
        status: 'TODO',
        assignee: null,
      });

      await service.create(dto, 'user-1');

      expect(mockPrismaService.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'TODO' }),
        }),
      );
    });

    it('should parse dueDate string to a Date object', async () => {
      const dto = {
        guidelineId: 'guide-1',
        title: 'Timed task',
        dueDate: '2026-06-01',
      };
      mockPrismaService.task.create.mockResolvedValue({
        id: 'task-3',
        ...dto,
        status: 'TODO',
        assignee: null,
      });

      await service.create(dto, 'user-1');

      const callData = mockPrismaService.task.create.mock.calls[0][0].data;
      expect(callData.dueDate).toBeInstanceOf(Date);
    });

    it('should store the entityType and entityId when provided', async () => {
      const dto = {
        guidelineId: 'guide-1',
        title: 'Linked task',
        entityType: 'Section',
        entityId: 'section-99',
      };
      mockPrismaService.task.create.mockResolvedValue({
        id: 'task-4',
        ...dto,
        status: 'TODO',
        assignee: null,
      });

      await service.create(dto, 'user-1');

      expect(mockPrismaService.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'Section',
            entityId: 'section-99',
          }),
        }),
      );
    });
  });

  describe('findByGuideline', () => {
    it('should return paginated tasks for the given guideline', async () => {
      const items = [
        { id: 't1', guidelineId: 'guide-1', title: 'Task A', status: 'TODO', assignee: null },
        { id: 't2', guidelineId: 'guide-1', title: 'Task B', status: 'IN_PROGRESS', assignee: null },
      ];
      mockPrismaService.task.findMany.mockResolvedValue(items);
      mockPrismaService.task.count.mockResolvedValue(2);

      const result = await service.findByGuideline('guide-1');

      expect(result.data).toEqual(items);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guidelineId: 'guide-1' },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
          include: { assignee: true },
        }),
      );
    });

    it('should filter by status when provided', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.task.count.mockResolvedValue(0);

      await service.findByGuideline('guide-1', { status: 'DONE' });

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guidelineId: 'guide-1', status: 'DONE' },
        }),
      );
    });

    it('should filter by assigneeId when provided', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.task.count.mockResolvedValue(0);

      await service.findByGuideline('guide-1', { assigneeId: 'user-10' });

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guidelineId: 'guide-1', assigneeId: 'user-10' },
        }),
      );
    });

    it('should apply both status and assigneeId filters simultaneously', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.task.count.mockResolvedValue(0);

      await service.findByGuideline('guide-1', { status: 'IN_PROGRESS', assigneeId: 'user-10' });

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guidelineId: 'guide-1', status: 'IN_PROGRESS', assigneeId: 'user-10' },
        }),
      );
    });

    it('should respect custom page and limit parameters', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.task.count.mockResolvedValue(60);

      const result = await service.findByGuideline('guide-1', {}, 3, 10);

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      const expected = { id: 'task-1', title: 'Some task', assignee: null };
      mockPrismaService.task.findUnique.mockResolvedValue(expected);

      const result = await service.findOne('task-1');

      expect(result).toEqual(expected);
      expect(mockPrismaService.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        include: { assignee: true },
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update the task status', async () => {
      const existing = { id: 'task-1', title: 'Old task', status: 'TODO' };
      const updated = { ...existing, status: 'IN_PROGRESS', assignee: null };
      mockPrismaService.task.findUnique.mockResolvedValue(existing);
      mockPrismaService.task.update.mockResolvedValue(updated);

      const result = await service.update('task-1', { status: 'IN_PROGRESS' }, 'user-1');

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        include: { assignee: true },
      });
    });

    it('should update title and description', async () => {
      const existing = { id: 'task-2', title: 'Old title', description: 'Old desc', status: 'TODO' };
      const updated = { ...existing, title: 'New title', description: 'New desc', assignee: null };
      mockPrismaService.task.findUnique.mockResolvedValue(existing);
      mockPrismaService.task.update.mockResolvedValue(updated);

      await service.update('task-2', { title: 'New title', description: 'New desc' }, 'user-1');

      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'New title', description: 'New desc' }),
        }),
      );
    });

    it('should set dueDate to null when an empty string is passed', async () => {
      const existing = { id: 'task-3', title: 'Dated task', status: 'TODO', dueDate: new Date('2026-01-01') };
      mockPrismaService.task.findUnique.mockResolvedValue(existing);
      mockPrismaService.task.update.mockResolvedValue({ ...existing, dueDate: null, assignee: null });

      await service.update('task-3', { dueDate: '' }, 'user-1');

      const updateData = mockPrismaService.task.update.mock.calls[0][0].data;
      expect(updateData.dueDate).toBeNull();
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { title: 'x' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not call task.update when the task is not found', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await service.update('missing-id', { title: 'x' }, 'user-1').catch(() => {});

      expect(mockPrismaService.task.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a task successfully', async () => {
      const existing = { id: 'task-1', title: 'To delete' };
      mockPrismaService.task.findUnique.mockResolvedValue(existing);
      mockPrismaService.task.delete.mockResolvedValue(existing);

      const result = await service.remove('task-1');

      expect(result).toEqual(existing);
      expect(mockPrismaService.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('should not call task.delete when the task is not found', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await service.remove('missing-id').catch(() => {});

      expect(mockPrismaService.task.delete).not.toHaveBeenCalled();
    });
  });
});
