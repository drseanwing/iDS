import { Test, TestingModule } from '@nestjs/testing';
import { PdfExportService } from './pdf-export.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { GuidelinesService } from '../guidelines/guidelines.service';
import { PdfGeneratorService } from './pdf-generator.service';

describe('PdfExportService – idempotency', () => {
  let service: PdfExportService;
  let prisma: jest.Mocked<PrismaService>;
  let guidelinesService: jest.Mocked<GuidelinesService>;

  const GUIDELINE_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
  const USER_ID = 'bbbbbbbb-0000-0000-0000-000000000001';
  const EXISTING_JOB_ID = 'cccccccc-0000-0000-0000-000000000001';

  beforeEach(async () => {
    const mockPrisma = {
      pdfExportJob: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const mockGuidelinesService = {
      findOne: jest.fn().mockResolvedValue({ id: GUIDELINE_ID }),
      exportJson: jest.fn(),
    };

    const mockStorage = {
      upload: jest.fn(),
      download: jest.fn(),
    };

    const mockPdfGenerator = {
      generatePdf: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfExportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: GuidelinesService, useValue: mockGuidelinesService },
        { provide: PdfGeneratorService, useValue: mockPdfGenerator },
      ],
    }).compile();

    service = module.get<PdfExportService>(PdfExportService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    guidelinesService = module.get(GuidelinesService) as jest.Mocked<GuidelinesService>;
  });

  describe('requestExport – deduplication', () => {
    it('returns existing PENDING job when a duplicate is requested within 5 minutes', async () => {
      const existingJob = {
        id: EXISTING_JOB_ID,
        guidelineId: GUIDELINE_ID,
        status: 'PENDING',
        options: null,
        createdAt: new Date(),
      };

      (prisma.pdfExportJob.findFirst as jest.Mock).mockResolvedValue(existingJob);

      const result = await service.requestExport(GUIDELINE_ID, USER_ID, undefined);

      expect(result.jobId).toBe(EXISTING_JOB_ID);
      expect(result.status).toBe('PENDING');
      expect((result as any).deduplicated).toBe(true);
      expect(prisma.pdfExportJob.create).not.toHaveBeenCalled();
    });

    it('returns existing PROCESSING job when a duplicate is requested within 5 minutes', async () => {
      const existingJob = {
        id: EXISTING_JOB_ID,
        guidelineId: GUIDELINE_ID,
        status: 'PROCESSING',
        options: null,
        createdAt: new Date(),
      };

      (prisma.pdfExportJob.findFirst as jest.Mock).mockResolvedValue(existingJob);

      const result = await service.requestExport(GUIDELINE_ID, USER_ID);

      expect(result.jobId).toBe(EXISTING_JOB_ID);
      expect((result as any).deduplicated).toBe(true);
      expect(prisma.pdfExportJob.create).not.toHaveBeenCalled();
    });

    it('creates a new job when no active job exists', async () => {
      (prisma.pdfExportJob.findFirst as jest.Mock).mockResolvedValue(null);

      const newJob = {
        id: 'new-job-id',
        guidelineId: GUIDELINE_ID,
        status: 'PENDING',
        createdAt: new Date(),
      };
      (prisma.pdfExportJob.create as jest.Mock).mockResolvedValue(newJob);
      // Prevent actual background processing
      jest.spyOn(service as any, 'processJob').mockResolvedValue(undefined);

      const result = await service.requestExport(GUIDELINE_ID, USER_ID);

      expect(result.jobId).toBe('new-job-id');
      expect((result as any).deduplicated).toBeUndefined();
      expect(prisma.pdfExportJob.create).toHaveBeenCalledTimes(1);
    });

    it('creates a new job when options differ from existing active job', async () => {
      const existingJob = {
        id: EXISTING_JOB_ID,
        guidelineId: GUIDELINE_ID,
        status: 'PENDING',
        options: { columns: 1 },
        createdAt: new Date(),
      };

      (prisma.pdfExportJob.findFirst as jest.Mock).mockResolvedValue(existingJob);

      const newJob = {
        id: 'new-job-id',
        guidelineId: GUIDELINE_ID,
        status: 'PENDING',
        createdAt: new Date(),
      };
      (prisma.pdfExportJob.create as jest.Mock).mockResolvedValue(newJob);
      jest.spyOn(service as any, 'processJob').mockResolvedValue(undefined);

      // Request with different options
      const result = await service.requestExport(GUIDELINE_ID, USER_ID, { columns: 2 } as any);

      expect(prisma.pdfExportJob.create).toHaveBeenCalledTimes(1);
      expect((result as any).deduplicated).toBeUndefined();
    });

    it('treats undefined options and null options as equivalent (deduplicates)', async () => {
      const existingJob = {
        id: EXISTING_JOB_ID,
        guidelineId: GUIDELINE_ID,
        status: 'PENDING',
        options: null,
        createdAt: new Date(),
      };

      (prisma.pdfExportJob.findFirst as jest.Mock).mockResolvedValue(existingJob);

      // Request with undefined options – should match null options in DB
      const result = await service.requestExport(GUIDELINE_ID, USER_ID, undefined);

      expect(result.jobId).toBe(EXISTING_JOB_ID);
      expect((result as any).deduplicated).toBe(true);
    });

    it('passes the 5-minute window boundary to the DB query', async () => {
      (prisma.pdfExportJob.findFirst as jest.Mock).mockResolvedValue(null);

      const newJob = {
        id: 'new-job-id',
        guidelineId: GUIDELINE_ID,
        status: 'PENDING',
        createdAt: new Date(),
      };
      (prisma.pdfExportJob.create as jest.Mock).mockResolvedValue(newJob);
      jest.spyOn(service as any, 'processJob').mockResolvedValue(undefined);

      await service.requestExport(GUIDELINE_ID, USER_ID);

      const findFirstCall = (prisma.pdfExportJob.findFirst as jest.Mock).mock.calls[0][0];
      expect(findFirstCall.where.status).toEqual({ in: ['PENDING', 'PROCESSING'] });
      expect(findFirstCall.where.createdAt.gte).toBeInstanceOf(Date);

      // The cutoff should be approximately 5 minutes ago
      const cutoff: Date = findFirstCall.where.createdAt.gte;
      const expectedCutoff = new Date(Date.now() - 5 * 60 * 1000);
      expect(Math.abs(cutoff.getTime() - expectedCutoff.getTime())).toBeLessThan(2000);
    });
  });
});
