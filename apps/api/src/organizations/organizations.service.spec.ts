import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  organization: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an organization', async () => {
      const dto = { name: 'Test Organization' };
      const expected = { id: 'uuid-1', ...dto };
      mockPrismaService.organization.create.mockResolvedValue(expected);

      const result = await service.create(dto);
      expect(result).toEqual(expected);
      expect(mockPrismaService.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Test Organization' }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all organizations', async () => {
      const expected = [{ id: '1', name: 'Org1' }];
      mockPrismaService.organization.findMany.mockResolvedValue(expected);

      const result = await service.findAll();
      expect(result).toEqual(expected);
      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith({
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an organization by id', async () => {
      const expected = { id: 'uuid-1', name: 'Test' };
      mockPrismaService.organization.findUnique.mockResolvedValue(expected);

      const result = await service.findOne('uuid-1');
      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException for missing organization', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete an organization', async () => {
      const existing = { id: 'uuid-1', name: 'Test' };
      mockPrismaService.organization.findUnique.mockResolvedValue(existing);
      mockPrismaService.organization.delete.mockResolvedValue(existing);

      const result = await service.remove('uuid-1');
      expect(result).toEqual(existing);
      expect(mockPrismaService.organization.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
    });
  });
});
