import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  user: {
    findMany: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should return [] for empty string', async () => {
      const result = await service.search('');
      expect(result).toEqual([]);
      expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
    });

    it('should return [] for single-character query', async () => {
      const result = await service.search('a');
      expect(result).toEqual([]);
      expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
    });

    it('should call prisma.user.findMany with correct where clause for 2+ char query', async () => {
      const expected = [{ id: 'user-1', email: 'john@example.com', displayName: 'John Doe' }];
      mockPrismaService.user.findMany.mockResolvedValue(expected);

      const result = await service.search('jo');

      expect(result).toEqual(expected);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { contains: 'jo', mode: 'insensitive' } },
            { displayName: { contains: 'jo', mode: 'insensitive' } },
          ],
        },
        select: { id: true, email: true, displayName: true },
        take: 10,
      });
    });
  });
});
