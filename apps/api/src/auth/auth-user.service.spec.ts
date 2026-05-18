import { Test, TestingModule } from '@nestjs/testing';
import { AuthUserService } from './auth-user.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  user: {
    upsert: jest.fn(),
  },
};

describe('AuthUserService', () => {
  let service: AuthUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthUserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get(AuthUserService);
    jest.clearAllMocks();
  });

  it('creates a local user record keyed by the Keycloak subject', async () => {
    mockPrismaService.user.upsert.mockResolvedValue({
      id: '3d75e681-ff70-412e-a686-8adea0d0528f',
      keycloakId: '3d75e681-ff70-412e-a686-8adea0d0528f',
      email: 'alice@example.com',
      displayName: 'Alice Smith',
    });

    await service.ensureUser({
      sub: '3d75e681-ff70-412e-a686-8adea0d0528f',
      email: 'alice@example.com',
      name: 'Alice Smith',
    });

    expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
      where: { keycloakId: '3d75e681-ff70-412e-a686-8adea0d0528f' },
      update: {
        email: 'alice@example.com',
        displayName: 'Alice Smith',
      },
      create: {
        id: '3d75e681-ff70-412e-a686-8adea0d0528f',
        keycloakId: '3d75e681-ff70-412e-a686-8adea0d0528f',
        email: 'alice@example.com',
        displayName: 'Alice Smith',
      },
    });
  });
});
