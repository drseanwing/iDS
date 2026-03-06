import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PicosService } from './picos.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  pico: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  picoCode: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

describe('PicosService', () => {
  let service: PicosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PicosService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PicosService>(PicosService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a PICO', async () => {
      const dto = {
        guidelineId: 'gl-uuid',
        population: 'Adults with hypertension',
        intervention: 'ACE inhibitors',
        comparator: 'Placebo',
      };
      const expected = { id: 'pico-1', ...dto };
      mockPrismaService.pico.create.mockResolvedValue(expected);

      const result = await service.create(dto);
      expect(result).toEqual(expected);
      expect(mockPrismaService.pico.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ population: 'Adults with hypertension' }),
      });
    });
  });

  describe('findByGuideline', () => {
    it('should return paginated PICOs with outcomes', async () => {
      const items = [{ id: 'pico-1', outcomes: [] }];
      mockPrismaService.pico.findMany.mockResolvedValue(items);
      mockPrismaService.pico.count.mockResolvedValue(1);

      const result = await service.findByGuideline('gl-uuid');
      expect(result.data).toEqual(items);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.pico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guidelineId: 'gl-uuid', isDeleted: false },
          include: expect.objectContaining({ outcomes: expect.any(Object) }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a PICO by id', async () => {
      const expected = { id: 'pico-1', population: 'Adults' };
      mockPrismaService.pico.findUnique.mockResolvedValue(expected);

      const result = await service.findOne('pico-1');
      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException for missing PICO', async () => {
      mockPrismaService.pico.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should soft-delete a PICO', async () => {
      const existing = { id: 'pico-1', population: 'Adults', isDeleted: false };
      mockPrismaService.pico.findUnique.mockResolvedValue(existing);
      mockPrismaService.pico.update.mockResolvedValue({ ...existing, isDeleted: true });

      const result = await service.softDelete('pico-1');
      expect(result.isDeleted).toBe(true);
    });
  });

  describe('addCode', () => {
    it('should add a terminology code to a PICO', async () => {
      const picoId = 'pico-1';
      const dto = {
        codeSystem: 'SNOMED_CT',
        code: '38341003',
        display: 'Hypertensive disorder',
        element: 'POPULATION',
      };
      const picoExists = { id: picoId };
      const createdCode = { id: 'code-1', picoId, ...dto };

      mockPrismaService.pico.findUnique.mockResolvedValue(picoExists);
      mockPrismaService.picoCode.create.mockResolvedValue(createdCode);

      const result = await service.addCode(picoId, dto);
      expect(result).toEqual(createdCode);
      expect(mockPrismaService.picoCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ picoId, code: '38341003' }),
      });
    });

    it('should throw NotFoundException when PICO does not exist', async () => {
      mockPrismaService.pico.findUnique.mockResolvedValue(null);

      await expect(
        service.addCode('missing', { codeSystem: 'SNOMED_CT', code: '123', display: 'Test', element: 'POPULATION' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCode', () => {
    it('should remove a terminology code from a PICO', async () => {
      const picoId = 'pico-1';
      const codeId = 'code-1';
      const existing = { id: codeId, picoId };
      const deleted = { id: codeId, picoId };

      mockPrismaService.picoCode.findUnique.mockResolvedValue(existing);
      mockPrismaService.picoCode.delete.mockResolvedValue(deleted);

      const result = await service.removeCode(picoId, codeId);
      expect(result).toEqual(deleted);
      expect(mockPrismaService.picoCode.delete).toHaveBeenCalledWith({
        where: { id: codeId },
      });
    });

    it('should throw NotFoundException when code does not exist', async () => {
      mockPrismaService.picoCode.findUnique.mockResolvedValue(null);

      await expect(service.removeCode('pico-1', 'missing-code')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when code belongs to different PICO', async () => {
      mockPrismaService.picoCode.findUnique.mockResolvedValue({ id: 'code-1', picoId: 'other-pico' });

      await expect(service.removeCode('pico-1', 'code-1')).rejects.toThrow(NotFoundException);
    });
  });
});
