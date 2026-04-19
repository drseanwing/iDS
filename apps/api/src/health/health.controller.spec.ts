import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockPrisma = {
    healthCheck: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', () => {
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('opengrade-api');
    expect(result.timestamp).toBeDefined();
  });

  it('should return readiness status when database is available', async () => {
    const result = await controller.ready();
    expect(result.status).toBe('ok');
    expect(result.checks.database).toBe('ok');
  });

  it('should throw when database is unavailable', async () => {
    mockPrisma.healthCheck.mockRejectedValueOnce(new Error('Connection refused'));
    await expect(controller.ready()).rejects.toThrow();
  });
});
