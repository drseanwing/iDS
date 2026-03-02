import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return auth status', () => {
    const result = controller.getStatus();
    expect(result.status).toBe('ok');
    expect(result.provider).toBe('keycloak');
  });

  it('should return user profile from request', () => {
    const req = {
      user: {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['admin'],
      },
    };
    const result = controller.getProfile(req);
    expect(result.sub).toBe('user-123');
    expect(result.email).toBe('test@example.com');
  });
});
