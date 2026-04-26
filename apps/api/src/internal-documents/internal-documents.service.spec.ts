import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InternalDocumentsService } from './internal-documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const mockPrismaService = {
  guideline: {
    findUnique: jest.fn(),
  },
  internalDocument: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
};

const mockStorageService = {
  upload: jest.fn(),
  download: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
};

describe('InternalDocumentsService', () => {
  let service: InternalDocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalDocumentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<InternalDocumentsService>(InternalDocumentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // upload
  // -------------------------------------------------------------------------

  describe('upload', () => {
    const guidelineId = 'guideline-uuid-1';
    const uploadedBy = 'user-uuid-1';
    const mockFile: Express.Multer.File = {
      originalname: 'report.pdf',
      buffer: Buffer.from('pdf content'),
      mimetype: 'application/pdf',
      size: 11,
      fieldname: 'file',
      encoding: '7bit',
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    it('uploads file to S3 and creates a database record', async () => {
      const createdDoc = {
        id: 'doc-uuid-1',
        guidelineId,
        title: 'report.pdf',
        s3Key: `internal-docs/${guidelineId}/some-uuid/report.pdf`,
        mimeType: 'application/pdf',
        uploadedBy,
        uploadedAt: new Date(),
      };

      mockPrismaService.guideline.findUnique.mockResolvedValue({ id: guidelineId });
      mockStorageService.upload.mockResolvedValue(createdDoc.s3Key);
      mockPrismaService.internalDocument.create.mockResolvedValue(createdDoc);

      const result = await service.upload(guidelineId, mockFile, undefined, uploadedBy);

      expect(mockStorageService.upload).toHaveBeenCalledWith(
        expect.stringContaining(`internal-docs/${guidelineId}/`),
        mockFile.buffer,
        mockFile.mimetype,
      );
      expect(mockPrismaService.internalDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          guidelineId,
          title: 'report.pdf',
          mimeType: 'application/pdf',
          uploadedBy,
        }),
      });
      expect(result).toEqual(createdDoc);
    });

    it('uses provided title instead of filename when title is given', async () => {
      mockPrismaService.guideline.findUnique.mockResolvedValue({ id: guidelineId });
      mockStorageService.upload.mockResolvedValue('some/key');
      mockPrismaService.internalDocument.create.mockResolvedValue({});

      await service.upload(guidelineId, mockFile, 'Custom Title', uploadedBy);

      expect(mockPrismaService.internalDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: 'Custom Title' }),
      });
    });

    it('throws NotFoundException when guideline does not exist', async () => {
      mockPrismaService.guideline.findUnique.mockResolvedValue(null);

      await expect(
        service.upload(guidelineId, mockFile, undefined, uploadedBy),
      ).rejects.toThrow(NotFoundException);

      expect(mockStorageService.upload).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    const guidelineId = 'guideline-uuid-1';

    it('returns documents metadata for a guideline', async () => {
      const docs = [
        { id: 'doc-1', guidelineId, title: 'Doc A', s3Key: 'key/a', mimeType: 'application/pdf', uploadedBy: 'user-1', uploadedAt: new Date() },
        { id: 'doc-2', guidelineId, title: 'Doc B', s3Key: 'key/b', mimeType: 'application/pdf', uploadedBy: 'user-1', uploadedAt: new Date() },
      ];

      mockPrismaService.guideline.findUnique.mockResolvedValue({ id: guidelineId });
      mockPrismaService.internalDocument.findMany.mockResolvedValue(docs);

      const result = await service.findAll(guidelineId);

      expect(result).toEqual(docs);
      expect(mockPrismaService.internalDocument.findMany).toHaveBeenCalledWith({
        where: { guidelineId },
        orderBy: { uploadedAt: 'desc' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    const guidelineId = 'guideline-uuid-1';
    const docId = 'doc-uuid-1';
    const s3Key = `internal-docs/${guidelineId}/uuid/report.pdf`;

    it('deletes record from DB and removes file from S3', async () => {
      const doc = { id: docId, guidelineId, title: 'report.pdf', s3Key, mimeType: 'application/pdf', uploadedBy: 'user-1', uploadedAt: new Date() };

      mockPrismaService.internalDocument.findFirst.mockResolvedValue(doc);
      mockStorageService.delete.mockResolvedValue(undefined);
      mockPrismaService.internalDocument.delete.mockResolvedValue(doc);

      await service.remove(guidelineId, docId);

      expect(mockStorageService.delete).toHaveBeenCalledWith(s3Key);
      expect(mockPrismaService.internalDocument.delete).toHaveBeenCalledWith({
        where: { id: docId },
      });
    });

    it('throws NotFoundException when document does not exist', async () => {
      mockPrismaService.internalDocument.findFirst.mockResolvedValue(null);

      await expect(service.remove(guidelineId, docId)).rejects.toThrow(NotFoundException);
      expect(mockStorageService.delete).not.toHaveBeenCalled();
    });
  });
});
