import { Test, TestingModule } from '@nestjs/testing';
import { VersionsService } from './versions.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VersionsService – idempotency', () => {
  let service: VersionsService;
  let prisma: jest.Mocked<PrismaService>;
  let storage: jest.Mocked<StorageService>;

  const GUIDELINE_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
  const USER_ID = 'bbbbbbbb-0000-0000-0000-000000000001';
  const EXISTING_VERSION_ID = 'cccccccc-0000-0000-0000-000000000001';

  /** Minimal valid guideline fixture */
  const mockGuideline = {
    id: GUIDELINE_ID,
    title: 'Test Guideline',
    shortName: 'TG',
    isDeleted: false,
    organization: { id: 'org1', name: 'Org', description: null, logoUrl: null, customColors: null, strengthLabels: null },
    sections: [],
    recommendations: [],
    references: [],
    picos: [],
  };

  const makeTransactionMock = () => {
    // Simulate prisma.$transaction by calling the callback with a mock tx client
    return jest.fn().mockImplementation(async (cb: any) => {
      const tx = {
        guidelineVersion: {
          create: jest.fn().mockResolvedValue({
            id: 'new-version-id',
            guidelineId: GUIDELINE_ID,
            versionNumber: '1.0',
            versionType: 'MAJOR',
            publishedAt: new Date(),
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        guideline: {
          update: jest.fn().mockResolvedValue({}),
        },
      };
      return cb(tx);
    });
  };

  beforeEach(async () => {
    const mockPrisma = {
      guideline: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      guidelineVersion: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: makeTransactionMock(),
    };

    const mockStorage = {
      upload: jest.fn().mockResolvedValue(undefined),
      download: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<VersionsService>(VersionsService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    storage = module.get(StorageService) as jest.Mocked<StorageService>;
  });

  describe('publish – duplicate prevention', () => {
    it('returns existing version when same versionType published within last minute', async () => {
      (prisma.guideline.findUnique as jest.Mock).mockResolvedValue(mockGuideline);

      const existingVersion = {
        id: EXISTING_VERSION_ID,
        guidelineId: GUIDELINE_ID,
        versionNumber: '1.0',
        versionType: 'MAJOR',
        publishedAt: new Date(), // just now
        comment: 'First publish',
        isPublic: true,
        publishedBy: USER_ID,
        snapshotBundle: {},
        jsonS3Key: null,
        pdfS3Key: null,
      };

      // findFirst is called twice: once for recentDuplicate check, once for lastVersion
      (prisma.guidelineVersion.findFirst as jest.Mock)
        .mockResolvedValueOnce(existingVersion); // recentDuplicate hit

      const result = await service.publish(
        { guidelineId: GUIDELINE_ID, versionType: 'MAJOR', comment: 'Retry publish', isPublic: true },
        USER_ID,
      );

      expect((result as any).id).toBe(EXISTING_VERSION_ID);
      expect((result as any).deduplicated).toBe(true);
      // Transaction should NOT have been called
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('proceeds with publish when no duplicate found within last minute', async () => {
      (prisma.guideline.findUnique as jest.Mock).mockResolvedValue(mockGuideline);

      // No recent duplicate, no last version
      (prisma.guidelineVersion.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)  // recentDuplicate check → no duplicate
        .mockResolvedValueOnce(null); // lastVersion → first ever version

      const result = await service.publish(
        { guidelineId: GUIDELINE_ID, versionType: 'MAJOR', comment: 'First publish', isPublic: true },
        USER_ID,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect((result as any).deduplicated).toBeUndefined();
    });

    it('does not deduplicate if the recent version has a different versionType', async () => {
      (prisma.guideline.findUnique as jest.Mock).mockResolvedValue(mockGuideline);

      // findFirst returns null (different versionType so no match in DB query)
      (prisma.guidelineVersion.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)  // no recentDuplicate for MINOR
        .mockResolvedValueOnce({      // lastVersion is MAJOR 1.0
          versionNumber: '1.0',
          versionType: 'MAJOR',
          publishedAt: new Date(Date.now() - 30 * 1000),
        });

      const result = await service.publish(
        { guidelineId: GUIDELINE_ID, versionType: 'MINOR', comment: 'Minor bump', isPublic: false },
        USER_ID,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect((result as any).deduplicated).toBeUndefined();
    });

    it('throws NotFoundException for missing guideline', async () => {
      (prisma.guideline.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.publish({ guidelineId: 'nonexistent', versionType: 'MAJOR' }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for deleted guideline', async () => {
      (prisma.guideline.findUnique as jest.Mock).mockResolvedValue({
        ...mockGuideline,
        isDeleted: true,
      });

      await expect(
        service.publish({ guidelineId: GUIDELINE_ID, versionType: 'MAJOR' }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('publish – S3 retry safety', () => {
    it('retries S3 upload once on failure and succeeds on retry', async () => {
      (prisma.guideline.findUnique as jest.Mock).mockResolvedValue(mockGuideline);
      (prisma.guidelineVersion.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      // First upload attempt fails, second succeeds
      (storage.upload as jest.Mock)
        .mockRejectedValueOnce(new Error('S3 transient error'))
        .mockResolvedValueOnce(undefined);

      await service.publish(
        { guidelineId: GUIDELINE_ID, versionType: 'MAJOR', comment: 'Retry S3', isPublic: false },
        USER_ID,
      );

      // Storage.upload should have been called twice (first fail + one retry)
      expect(storage.upload).toHaveBeenCalledTimes(2);
      // Transaction should still complete
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('continues without S3 key when both upload attempts fail', async () => {
      (prisma.guideline.findUnique as jest.Mock).mockResolvedValue(mockGuideline);
      (prisma.guidelineVersion.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      // Both upload attempts fail
      (storage.upload as jest.Mock).mockRejectedValue(new Error('S3 unavailable'));

      await service.publish(
        { guidelineId: GUIDELINE_ID, versionType: 'MAJOR', comment: 'S3 down', isPublic: false },
        USER_ID,
      );

      // Storage.upload should have been called twice (original + retry)
      expect(storage.upload).toHaveBeenCalledTimes(2);
      // Publish should still succeed via transaction
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('publish – transaction wrapping', () => {
    it('uses prisma.$transaction for DB writes', async () => {
      (prisma.guideline.findUnique as jest.Mock).mockResolvedValue(mockGuideline);
      (prisma.guidelineVersion.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await service.publish(
        { guidelineId: GUIDELINE_ID, versionType: 'MAJOR', isPublic: true },
        USER_ID,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
