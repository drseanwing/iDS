import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PdfExportService } from './pdf-export.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { GuidelinesService } from '../guidelines/guidelines.service';

describe('PdfExportService', () => {
  let service: PdfExportService;
  let prisma: any;
  let storage: any;
  let guidelines: any;
  let pdfGenerator: any;

  const mockPrisma = {
    pdfExportJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockStorage = {
    upload: jest.fn().mockResolvedValue('pdf-exports/g-1/job-1.pdf'),
    download: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 test content')),
  };

  const mockGuidelines = {
    findOne: jest.fn().mockResolvedValue({ id: 'g-1', title: 'Test' }),
    exportJson: jest.fn().mockResolvedValue({
      guideline: { id: 'g-1', title: 'Test' },
      organization: null,
      sections: [],
      recommendations: [],
      picos: [],
      references: [],
    }),
  };

  const mockPdfGenerator = {
    generatePdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 test')),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfExportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: GuidelinesService, useValue: mockGuidelines },
        { provide: PdfGeneratorService, useValue: mockPdfGenerator },
      ],
    }).compile();

    service = module.get<PdfExportService>(PdfExportService);
    prisma = module.get(PrismaService);
    storage = module.get(StorageService);
    guidelines = module.get(GuidelinesService);
    pdfGenerator = module.get(PdfGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestExport', () => {
    it('should create a job and return the job ID', async () => {
      mockPrisma.pdfExportJob.create.mockResolvedValue({
        id: 'job-1',
        guidelineId: 'g-1',
        status: 'PENDING',
        createdAt: new Date(),
      });
      mockPrisma.pdfExportJob.update.mockResolvedValue({
        id: 'job-1',
        status: 'PROCESSING',
      });

      const result = await service.requestExport('g-1', 'user-1');

      expect(result.jobId).toBe('job-1');
      expect(result.status).toBe('PENDING');
      expect(mockGuidelines.findOne).toHaveBeenCalledWith('g-1');
      expect(mockPrisma.pdfExportJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            guidelineId: 'g-1',
            requestedBy: 'user-1',
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should pass options to the job', async () => {
      mockPrisma.pdfExportJob.create.mockResolvedValue({
        id: 'job-2',
        guidelineId: 'g-1',
        status: 'PENDING',
        createdAt: new Date(),
      });
      mockPrisma.pdfExportJob.update.mockResolvedValue({
        id: 'job-2',
        status: 'PROCESSING',
      });

      const options = { pdfColumnLayout: 2, picoDisplayMode: 'ANNEX' };
      await service.requestExport('g-1', 'user-1', options as any);

      expect(mockPrisma.pdfExportJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            options,
          }),
        }),
      );
    });
  });

  describe('getJobStatus', () => {
    it('should return job status with downloadReady flag', async () => {
      mockPrisma.pdfExportJob.findUnique.mockResolvedValue({
        id: 'job-1',
        guidelineId: 'g-1',
        status: 'COMPLETED',
        s3Key: 'pdf-exports/g-1/job-1.pdf',
        errorMessage: null,
        options: null,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      });

      const result = await service.getJobStatus('job-1');
      expect(result.downloadReady).toBe(true);
      expect(result.status).toBe('COMPLETED');
    });

    it('should set downloadReady=false for non-completed jobs', async () => {
      mockPrisma.pdfExportJob.findUnique.mockResolvedValue({
        id: 'job-1',
        guidelineId: 'g-1',
        status: 'PROCESSING',
        s3Key: null,
        errorMessage: null,
        options: null,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
      });

      const result = await service.getJobStatus('job-1');
      expect(result.downloadReady).toBe(false);
    });

    it('should throw NotFoundException for unknown job', async () => {
      mockPrisma.pdfExportJob.findUnique.mockResolvedValue(null);

      await expect(service.getJobStatus('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('downloadPdf', () => {
    it('should download the PDF buffer from storage', async () => {
      mockPrisma.pdfExportJob.findUnique.mockResolvedValue({
        id: 'job-1',
        guidelineId: 'g-1',
        status: 'COMPLETED',
        s3Key: 'pdf-exports/g-1/job-1.pdf',
        guideline: { id: 'g-1', shortName: 'TG-2026' },
      });

      const { buffer, filename } = await service.downloadPdf('job-1');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(filename).toBe('guideline-TG-2026.pdf');
      expect(mockStorage.download).toHaveBeenCalledWith('pdf-exports/g-1/job-1.pdf');
    });

    it('should throw NotFoundException if job not completed', async () => {
      mockPrisma.pdfExportJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'PROCESSING',
        s3Key: null,
        guideline: { id: 'g-1', shortName: 'TG' },
      });

      await expect(service.downloadPdf('job-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for unknown job', async () => {
      mockPrisma.pdfExportJob.findUnique.mockResolvedValue(null);

      await expect(service.downloadPdf('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listJobs', () => {
    it('should list jobs for a guideline', async () => {
      mockPrisma.pdfExportJob.findMany.mockResolvedValue([
        { id: 'job-1', status: 'COMPLETED', createdAt: new Date(), completedAt: new Date(), errorMessage: null },
      ]);

      const result = await service.listJobs('g-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.pdfExportJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guidelineId: 'g-1' },
          take: 10,
        }),
      );
    });

    it('should respect custom limit', async () => {
      mockPrisma.pdfExportJob.findMany.mockResolvedValue([]);

      await service.listJobs('g-1', 5);
      expect(mockPrisma.pdfExportJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });
});
