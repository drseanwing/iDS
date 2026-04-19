import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CoiService } from './coi.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const mockPrismaService = {
  pico: {
    findMany: jest.fn(),
  },
  coiRecord: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  coiInterventionConflict: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  coiDocument: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockStorageService = {
  upload: jest.fn(),
  download: jest.fn(),
  getPresignedUrl: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
};

describe('CoiService', () => {
  let service: CoiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoiService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<CoiService>(CoiService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // refreshInterventionMatrix
  // -------------------------------------------------------------------------

  describe('refreshInterventionMatrix', () => {
    const guidelineId = 'guideline-uuid-1';

    it('creates missing conflict records for each COI record × intervention label', async () => {
      // Two PICOs with distinct intervention and comparator
      mockPrismaService.pico.findMany.mockResolvedValue([
        { intervention: 'Drug A', comparator: 'Placebo' },
        { intervention: 'Drug B', comparator: 'Drug A' }, // Drug A appears twice — dedup
      ]);

      // One COI record
      mockPrismaService.coiRecord.findMany.mockResolvedValue([{ id: 'record-1' }]);

      // No existing conflicts yet
      mockPrismaService.coiInterventionConflict.findMany.mockResolvedValue([]);
      mockPrismaService.coiInterventionConflict.createMany.mockResolvedValue({ count: 3 });

      await service.refreshInterventionMatrix(guidelineId);

      expect(mockPrismaService.coiInterventionConflict.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ coiRecordId: 'record-1', interventionLabel: 'Drug A', conflictLevel: 'NONE' }),
          expect.objectContaining({ coiRecordId: 'record-1', interventionLabel: 'Placebo', conflictLevel: 'NONE' }),
          expect.objectContaining({ coiRecordId: 'record-1', interventionLabel: 'Drug B', conflictLevel: 'NONE' }),
        ]),
        skipDuplicates: true,
      });

      // 3 unique labels: Drug A, Placebo, Drug B
      const callArg = mockPrismaService.coiInterventionConflict.createMany.mock.calls[0][0];
      expect(callArg.data).toHaveLength(3);
    });

    it('preserves existing conflict records and only creates missing ones', async () => {
      mockPrismaService.pico.findMany.mockResolvedValue([
        { intervention: 'Drug A', comparator: 'Placebo' },
      ]);

      mockPrismaService.coiRecord.findMany.mockResolvedValue([{ id: 'record-1' }]);

      // Drug A conflict already exists
      mockPrismaService.coiInterventionConflict.findMany.mockResolvedValue([
        { coiRecordId: 'record-1', interventionLabel: 'Drug A' },
      ]);
      mockPrismaService.coiInterventionConflict.createMany.mockResolvedValue({ count: 1 });

      await service.refreshInterventionMatrix(guidelineId);

      const callArg = mockPrismaService.coiInterventionConflict.createMany.mock.calls[0][0];
      // Only Placebo should be created — Drug A already exists
      expect(callArg.data).toHaveLength(1);
      expect(callArg.data[0]).toMatchObject({
        coiRecordId: 'record-1',
        interventionLabel: 'Placebo',
        conflictLevel: 'NONE',
      });
    });

    it('does not call createMany when all conflicts already exist', async () => {
      mockPrismaService.pico.findMany.mockResolvedValue([
        { intervention: 'Drug A', comparator: 'Placebo' },
      ]);

      mockPrismaService.coiRecord.findMany.mockResolvedValue([{ id: 'record-1' }]);

      mockPrismaService.coiInterventionConflict.findMany.mockResolvedValue([
        { coiRecordId: 'record-1', interventionLabel: 'Drug A' },
        { coiRecordId: 'record-1', interventionLabel: 'Placebo' },
      ]);

      await service.refreshInterventionMatrix(guidelineId);

      expect(mockPrismaService.coiInterventionConflict.createMany).not.toHaveBeenCalled();
    });

    it('does nothing when there are no PICOs', async () => {
      mockPrismaService.pico.findMany.mockResolvedValue([]);
      mockPrismaService.coiRecord.findMany.mockResolvedValue([{ id: 'record-1' }]);
      mockPrismaService.coiInterventionConflict.findMany.mockResolvedValue([]);

      await service.refreshInterventionMatrix(guidelineId);

      expect(mockPrismaService.coiInterventionConflict.createMany).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // bulkSetConflictLevel
  // -------------------------------------------------------------------------

  describe('bulkSetConflictLevel', () => {
    const guidelineId = 'guideline-uuid-1';

    it('updates all conflicts for a given intervention label (per-intervention mode)', async () => {
      mockPrismaService.coiInterventionConflict.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.bulkSetConflictLevel(guidelineId, {
        mode: 'per-intervention',
        interventionLabel: 'Drug A',
        conflictLevel: 'HIGH',
      });

      expect(result).toBe(5);
      expect(mockPrismaService.coiInterventionConflict.updateMany).toHaveBeenCalledWith({
        where: {
          interventionLabel: 'Drug A',
          coiRecord: { guidelineId },
        },
        data: { conflictLevel: 'HIGH' },
      });
    });

    it('updates all conflicts for a given COI record (per-member mode)', async () => {
      mockPrismaService.coiInterventionConflict.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkSetConflictLevel(guidelineId, {
        mode: 'per-member',
        coiRecordId: 'record-uuid-1',
        conflictLevel: 'MODERATE',
      });

      expect(result).toBe(3);
      expect(mockPrismaService.coiInterventionConflict.updateMany).toHaveBeenCalledWith({
        where: { coiRecordId: 'record-uuid-1' },
        data: { conflictLevel: 'MODERATE' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // uploadDocument
  // -------------------------------------------------------------------------

  describe('uploadDocument', () => {
    it('throws NotFoundException when COI record does not exist', async () => {
      mockPrismaService.coiRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadDocument('nonexistent-id', {
          originalname: 'test.pdf',
          buffer: Buffer.from(''),
          mimetype: 'application/pdf',
        } as Express.Multer.File),
      ).rejects.toThrow(NotFoundException);
    });

    it('uploads file to storage and persists document record', async () => {
      const coiRecordId = 'record-uuid-1';
      const guidelineId = 'guideline-uuid-1';

      mockPrismaService.coiRecord.findUnique.mockResolvedValue({ id: coiRecordId, guidelineId });
      mockStorageService.upload.mockResolvedValue(`coi-documents/${guidelineId}/${coiRecordId}/xxx-test.pdf`);
      mockPrismaService.coiDocument.create.mockResolvedValue({
        id: 'doc-uuid-1',
        coiRecordId,
        fileName: 'test.pdf',
        s3Key: `coi-documents/${guidelineId}/${coiRecordId}/xxx-test.pdf`,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
      });

      const result = await service.uploadDocument(coiRecordId, {
        originalname: 'test.pdf',
        buffer: Buffer.from('pdf content'),
        mimetype: 'application/pdf',
      } as Express.Multer.File);

      expect(mockStorageService.upload).toHaveBeenCalledWith(
        expect.stringContaining(`coi-documents/${guidelineId}/${coiRecordId}/`),
        expect.any(Buffer),
        'application/pdf',
      );
      expect(mockPrismaService.coiDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          coiRecordId,
          fileName: 'test.pdf',
          mimeType: 'application/pdf',
        }),
      });
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('document');
    });
  });

  // -------------------------------------------------------------------------
  // getDocuments
  // -------------------------------------------------------------------------

  describe('getDocuments', () => {
    it('throws NotFoundException when COI record does not exist', async () => {
      mockPrismaService.coiRecord.findUnique.mockResolvedValue(null);

      await expect(service.getDocuments('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('returns list of documents for a COI record', async () => {
      const coiRecordId = 'record-uuid-1';
      const docs = [
        { id: 'doc-1', coiRecordId, fileName: 'coi.pdf', s3Key: 'some/key', mimeType: 'application/pdf', uploadedAt: new Date() },
      ];

      mockPrismaService.coiRecord.findUnique.mockResolvedValue({ id: coiRecordId });
      mockPrismaService.coiDocument.findMany.mockResolvedValue(docs);

      const result = await service.getDocuments(coiRecordId);

      expect(result).toEqual(docs);
      expect(mockPrismaService.coiDocument.findMany).toHaveBeenCalledWith({
        where: { coiRecordId },
        orderBy: { uploadedAt: 'desc' },
      });
    });
  });
});
