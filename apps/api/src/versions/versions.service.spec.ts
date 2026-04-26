import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VersionType } from '@prisma/client';
import { VersionsService } from './versions.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const mockPrismaService = {
  guideline: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  guidelineVersion: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockStorageService = {
  upload: jest.fn(),
  download: jest.fn(),
  delete: jest.fn(),
};

const minimalGuideline = {
  id: 'g-1',
  title: 'Test Guideline',
  isDeleted: false,
  organization: null,
  sections: [],
  recommendations: [],
  references: [],
  picos: [],
};

describe('VersionsService', () => {
  let service: VersionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<VersionsService>(VersionsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publish', () => {
    beforeEach(() => {
      mockPrismaService.guideline.findUnique.mockResolvedValue(minimalGuideline);
      // No recent duplicate
      mockPrismaService.guidelineVersion.findFirst
        .mockResolvedValueOnce(null) // recent duplicate check
        .mockResolvedValueOnce(null); // lastVersion check
      mockStorageService.upload.mockResolvedValue(undefined);
      mockPrismaService.$transaction.mockImplementation((cb: (tx: any) => Promise<any>) =>
        cb(mockPrismaService),
      );
      mockPrismaService.guidelineVersion.create.mockResolvedValue({
        id: 'ver-1',
        guidelineId: 'g-1',
        versionNumber: '0.1',
        versionType: 'MINOR',
      });
      mockPrismaService.guidelineVersion.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.guideline.update.mockResolvedValue({});
    });

    it('creates a GuidelineVersion record', async () => {
      const dto = { guidelineId: 'g-1', versionType: 'MINOR', comment: 'first', isPublic: false };
      const result = await service.publish(dto as any, 'user-1');

      expect(mockPrismaService.guidelineVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ guidelineId: 'g-1', versionType: 'MINOR' }),
        }),
      );
      expect(result).toMatchObject({ id: 'ver-1', versionNumber: '0.1' });
    });

    it('returns deduplicated version when a recent duplicate exists', async () => {
      const existingVersion = { id: 'ver-old', guidelineId: 'g-1', versionType: 'MINOR' };
      mockPrismaService.guidelineVersion.findFirst
        .mockReset()
        .mockResolvedValueOnce(existingVersion); // recent duplicate found

      const dto = { guidelineId: 'g-1', versionType: 'MINOR', comment: 'dup' };
      const result = await service.publish(dto as any, 'user-1');

      expect(result).toMatchObject({ ...existingVersion, deduplicated: true });
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when publishing a deleted guideline', async () => {
      mockPrismaService.guideline.findUnique.mockResolvedValue({
        ...minimalGuideline,
        isDeleted: true,
      });

      await expect(
        service.publish({ guidelineId: 'g-1', versionType: 'MINOR' } as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('computeNextVersion', () => {
    // Access private method through type cast
    const compute = (service: VersionsService, last: string | null, type: VersionType) =>
      (service as any).computeNextVersion(last, type);

    it('increments minor for MINOR type: "1.0" → "1.1"', () => {
      expect(compute(service, '1.0', VersionType.MINOR)).toBe('1.1');
    });

    it('increments major for MAJOR type: "1.0" → "2.0"', () => {
      expect(compute(service, '1.0', VersionType.MAJOR)).toBe('2.0');
    });

    it('starts at "0.1" when no previous version and type is MINOR', () => {
      expect(compute(service, null, VersionType.MINOR)).toBe('0.1');
    });

    it('starts at "1.0" when no previous version and type is MAJOR', () => {
      expect(compute(service, null, VersionType.MAJOR)).toBe('1.0');
    });
  });

  describe('findByGuideline', () => {
    it('returns paginated versions with publisher name', async () => {
      const versions = [{ id: 'ver-1', guidelineId: 'g-1', publishedBy: 'user-1' }];
      mockPrismaService.guidelineVersion.findMany.mockResolvedValue(versions);
      mockPrismaService.guidelineVersion.count.mockResolvedValue(1);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', displayName: 'Alice', email: 'alice@example.com' },
      ]);

      const result = await service.findByGuideline('g-1');

      expect(result.data[0]).toMatchObject({ id: 'ver-1', publisherName: 'Alice' });
      expect(result.meta.total).toBe(1);
    });
  });

  describe('compare', () => {
    it('returns two version snapshots by their IDs', async () => {
      const v1 = { id: 'v1', versionNumber: '1.0', snapshotBundle: { data: 'a' } };
      const v2 = { id: 'v2', versionNumber: '1.1', snapshotBundle: { data: 'b' } };
      mockPrismaService.guidelineVersion.findUnique
        .mockResolvedValueOnce(v1)
        .mockResolvedValueOnce(v2);

      const result = await service.compare('v1', 'v2');

      expect(result.v1.id).toBe('v1');
      expect(result.v2.id).toBe('v2');
      expect(result.v1.snapshotBundle).toEqual({ data: 'a' });
      expect(result.v2.snapshotBundle).toEqual({ data: 'b' });
    });

    it('throws NotFoundException when first version is missing', async () => {
      mockPrismaService.guidelineVersion.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'v2' });

      await expect(service.compare('missing', 'v2')).rejects.toThrow(NotFoundException);
    });
  });
});
